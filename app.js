const dateInput = document.getElementById("date");
const searchForm = document.getElementById("searchForm");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const resultsSection = document.getElementById("bus-results");
const resultsList = document.getElementById("bus-results-list");
const resultsSummary = document.getElementById("results-summary");

const buses = [
  { id: "astc-mankachar-express", operator: "ASTC", name: "Mankachar Express", type: "AC Seater", price: 480, from: "Mankachar", to: "Guwahati", departure: "05:30 AM", arrival: "01:00 PM", duration: "7h 30m", seats: 32 },
  { id: "janbahon-south-assam", operator: "JANBAHON", name: "South Assam Travels", type: "Non-AC Seater", price: 390, from: "Mankachar", to: "Guwahati", departure: "07:30 AM", arrival: "03:30 PM", duration: "8h", seats: 40 },
  { id: "assam-roadways-brahmaputra", operator: "Assam Roadways", name: "Brahmaputra Superfast", type: "AC Seater", price: 520, from: "Mankachar", to: "Guwahati", departure: "06:15 AM", arrival: "01:45 PM", duration: "7h 30m", seats: 44 },
  { id: "janbahon-barak-valley", operator: "JANBAHON", name: "Barak Valley Express", type: "Non-AC Seater", price: 360, from: "Mankachar", to: "Guwahati", departure: "08:00 AM", arrival: "04:30 PM", duration: "8h 30m", seats: 36 },
  { id: "northeast-night-rider", operator: "Northeast Travels", name: "Assam Night Rider", type: "AC Seater", price: 550, from: "Mankachar", to: "Guwahati", departure: "09:00 PM", arrival: "05:30 AM", duration: "8h 30m", seats: 48 }
];

let currentBooking = null;
let selectedSeats = [];
let passengerData = [];

function getLocalISODate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

if (dateInput) {
  dateInput.min = getLocalISODate();
  if (!dateInput.value) dateInput.value = dateInput.min;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function searchBuses() {
  const from = fromInput.value;
  const to = toInput.value;
  const date = dateInput.value;
  if (!from || !to || !date) return;
  if (from === to) {
    alert("Origin and destination cannot be the same.");
    return;
  }
  const matches = buses.filter(bus => bus.from === from && bus.to === to);
  renderResults(matches, from, to, date);
  resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResults(matches, from, to, date) {
  resultsList.innerHTML = "";
  if (!matches.length) {
    resultsSummary.textContent = `${from} → ${to} • ${formatDate(date)} • No buses found`;
    resultsList.innerHTML = `<div class="empty-results"><h3>No buses found for this route</h3><p>Try another route or check the journey date.</p></div>`;
    return;
  }

  resultsSummary.textContent = `${from} → ${to} • ${formatDate(date)} • ${matches.length} buses found`;

  matches.forEach(bus => {
    const card = document.createElement("article");
    card.className = "bus-card";
    card.innerHTML = `
      <div class="bus-operator-block"><div class="bus-operator">${escapeHTML(bus.operator)}</div></div>
      <div class="bus-info">
        <h3>${escapeHTML(bus.name)}</h3>
        <p class="bus-type">${escapeHTML(bus.type)}</p>
        <p class="bus-price">₹${bus.price.toLocaleString("en-IN")} <span>per seat</span></p>
      </div>
      <div class="bus-journey-line">
        <div class="journey-point"><strong>${escapeHTML(bus.from)}</strong><span>${escapeHTML(bus.departure)}</span></div>
        <div class="journey-track" aria-hidden="true"><span class="track-dot"></span><span class="track-line"></span><span class="bus-icon">▣</span><span class="track-line"></span><span class="track-dot"></span><small>${escapeHTML(bus.duration)}</small></div>
        <div class="journey-point journey-arrival"><strong>${escapeHTML(bus.to)}</strong><span>${escapeHTML(bus.arrival)}</span></div>
      </div>
      <div class="bus-action"><span class="bus-seats">${bus.seats} seats</span><button class="book-seat" type="button">Book Seat</button></div>`;
    card.querySelector(".book-seat").addEventListener("click", () => openSeatModal(bus));
    resultsList.appendChild(card);
  });

  const note = document.createElement("p");
  note.className = "bus-results-note";
  note.textContent = "Note: Bus timings are subject to change. Please arrive at the boarding point at least 30 minutes before departure.";
  resultsList.appendChild(note);
}

searchForm?.addEventListener("submit", event => {
  event.preventDefault();
  searchBuses();
});

document.getElementById("swap")?.addEventListener("click", () => {
  const currentFrom = fromInput.value;
  fromInput.value = toInput.value;
  toInput.value = currentFrom;
});

document.querySelectorAll(".route-card").forEach(card => {
  card.addEventListener("click", () => {
    fromInput.value = card.dataset.from || "";
    toInput.value = card.dataset.to || "";
    if (!dateInput.value) dateInput.value = dateInput.min;
    searchBuses();
  });
});

function injectBookingStyles() {
  if (document.getElementById("janbahon-booking-styles")) return;
  const style = document.createElement("style");
  style.id = "janbahon-booking-styles";
  style.textContent = `
    body.modal-open{overflow:hidden}
    .booking-overlay{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,31,67,.74);backdrop-filter:blur(5px);opacity:0;pointer-events:none;transition:.2s;overflow:auto}
    .booking-modal.open .booking-overlay{opacity:1;pointer-events:auto}
    .booking-box{position:relative;width:min(100%,860px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:26px;box-shadow:0 25px 80px rgba(0,0,0,.28);padding:32px}
    .booking-close{position:absolute;top:16px;right:16px;width:42px;height:42px;border:0;border-radius:50%;background:#f0f3f7;color:#082b5c;font-size:25px}
    .booking-close:hover{background:#e3e8ee}
    .booking-head{text-align:center;padding:0 40px 24px}.booking-step{margin:0 0 7px;color:#f47b20;font-size:12px;font-weight:800;letter-spacing:2.5px}.booking-head h2{margin:0;color:#082b5c;font-size:32px}.booking-head p{margin:8px 0 0;color:#6d7788}
    .seat-legend{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin:4px 0 18px;color:#6d7788;font-size:13px}.seat-legend span{display:flex;align-items:center;gap:6px}.legend{width:16px;height:16px;border-radius:5px;border:1px solid #d9e0e8;background:#fff}.legend.selected{background:#16824b;border-color:#16824b}.legend.booked{background:#d9dee6;border-color:#d9dee6}
    .bus-layout{width:min(100%,410px);margin:auto;padding:17px;border:1px solid #dce2e9;border-radius:24px;background:#f8fafc}.driver{padding:10px;margin-bottom:17px;text-align:right;border-radius:10px;background:#e8edf3;color:#6d7788;font-size:11px;font-weight:800;letter-spacing:1px}.seat-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}.seat{min-height:50px;border:2px solid #dfe5eb;border-radius:11px;background:#fff;color:#082b5c;font-weight:800;transition:.15s}.seat:hover:not(:disabled){border-color:#16824b;transform:translateY(-1px)}.seat.selected{background:#16824b;border-color:#16824b;color:#fff}.seat.booked{background:#d9dee6;border-color:#d9dee6;color:#8b95a4;cursor:not-allowed}
    .booking-summary{display:flex;justify-content:space-between;gap:15px;margin-top:18px;padding:17px 19px;background:#f5f7fa;border-radius:15px}.booking-summary span{display:block;color:#7b8798;font-size:12px;margin-bottom:3px}.booking-summary strong{color:#082b5c;font-size:16px}.booking-primary{width:100%;min-height:52px;margin-top:17px;border:0;border-radius:12px;background:#f47b20;color:#fff;font-weight:800;font-size:16px}.booking-primary:hover:not(:disabled){background:#d96512}.booking-primary:disabled{background:#cbd2db;cursor:not-allowed}
    .passenger-list{display:grid;gap:13px}.passenger-card{padding:18px;border:1px solid #e1e6ed;border-radius:16px}.passenger-card-header{display:flex;justify-content:space-between;gap:10px;margin-bottom:14px}.passenger-card-header strong{color:#082b5c}.passenger-card-header span{padding:4px 9px;border-radius:99px;background:#fff4ea;color:#d96512;font-size:11px;font-weight:800}.passenger-fields{display:grid;grid-template-columns:1fr 1fr;gap:13px}.passenger-field{display:flex;flex-direction:column;gap:6px}.passenger-field label{font-size:12px;font-weight:800;color:#082b5c}.passenger-field input{min-height:47px;padding:0 12px;border:1px solid #dce2e9;border-radius:10px;outline:0}.passenger-field input:focus{border-color:#f47b20;box-shadow:0 0 0 3px rgba(244,123,32,.12)}.passenger-field input:disabled{background:#f1f4f7}.same-number{display:flex;align-items:center;gap:7px;margin-top:10px;color:#536073;font-size:12px;cursor:pointer}.same-number input{accent-color:#16824b}
    .review-card{border:1px solid #e1e6ed;border-radius:18px;overflow:hidden}.review-section{padding:20px;border-bottom:1px solid #e7ebf0}.review-section:last-child{border-bottom:0}.review-section h3{margin:0 0 14px;color:#082b5c;font-size:16px}.review-route{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center}.review-place strong{display:block;color:#082b5c;font-size:18px}.review-place span{color:#6d7788;font-size:13px}.review-arrow{color:#f47b20;font-size:24px}.review-passenger{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #eef1f4}.review-passenger:last-child{border-bottom:0}.review-passenger strong{color:#172033}.review-passenger span{color:#6d7788}.fare-row{display:flex;justify-content:space-between;padding:7px 0;color:#536073}.fare-total{display:flex;justify-content:space-between;margin-top:8px;padding-top:14px;border-top:1px solid #dfe4ea;color:#082b5c;font-size:20px;font-weight:800}
    .payment-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}.payment-method{padding:14px;border:1px solid #dce2e9;border-radius:12px;background:#fff;color:#082b5c;font-weight:800;text-align:center}.payment-method.active{border:2px solid #f47b20;background:#fff8f2}.payment-panel{padding:18px;background:#f6f8fb;border-radius:15px}.payment-panel label{display:block;color:#082b5c;font-size:12px;font-weight:800;margin-bottom:7px}.payment-panel input{width:100%;height:47px;padding:0 12px;border:1px solid #dce2e9;border-radius:10px;background:#fff;margin-bottom:13px}.upi-row{display:flex;gap:10px}.upi-row input{margin-bottom:0}.secure-note{text-align:center;color:#6d7788;font-size:12px;margin:12px 0 0}.success-box{text-align:center;padding:18px}.success-icon{width:64px;height:64px;margin:0 auto 12px;display:grid;place-items:center;border-radius:50%;background:#e7f7ef;color:#16824b;font-size:30px;font-weight:900}.success-box h2{margin:0;color:#082b5c}.success-box p{color:#6d7788}.booking-id{display:inline-block;padding:9px 14px;border-radius:10px;background:#f5f7fa;color:#082b5c;font-weight:800;letter-spacing:1px}
    @media(max-width:700px){.booking-overlay{padding:8px}.booking-box{padding:22px 15px;border-radius:20px;max-height:calc(100vh - 16px)}.booking-head{padding:0 30px 20px}.booking-head h2{font-size:25px}.passenger-fields{grid-template-columns:1fr}.review-route{grid-template-columns:1fr;text-align:center;gap:8px}.review-arrow{transform:rotate(90deg)}.payment-methods{grid-template-columns:1fr}.booking-summary{flex-direction:column}.seat{min-height:47px;font-size:12px}}
  `;
  document.head.appendChild(style);
}

function ensureModal(id, titleClass = "booking-modal") {
  let modal = document.getElementById(id);
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = id;
  modal.className = titleClass;
  modal.innerHTML = `<div class="booking-overlay"><div class="booking-box"></div></div>`;
  document.body.appendChild(modal);
  return modal;
}

function openSeatModal(bus) {
  injectBookingStyles();
  selectedSeats = [];
  currentBooking = { bus, date: dateInput.value };
  const modal = ensureModal("seat-modal");
  const box = modal.querySelector(".booking-box");
  const bookedCount = Math.max(2, Math.floor(bus.seats * 0.18));
  const bookedSeats = new Set();
  for (let i = 0; i < bookedCount; i++) bookedSeats.add(((i * 7 + 3) % bus.seats) + 1);

  const seats = Array.from({length: bus.seats}, (_, i) => i + 1).map(n => {
    const booked = bookedSeats.has(n);
    return `<button type="button" class="seat ${booked ? "booked" : ""}" data-seat="${n}" ${booked ? "disabled" : ""}>${n}</button>`;
  }).join("");

  box.innerHTML = `
    <button class="booking-close" type="button" aria-label="Close">×</button>
    <div class="booking-head"><p class="booking-step">SELECT YOUR SEAT</p><h2>${escapeHTML(bus.name)}</h2><p>${escapeHTML(bus.type)} • ₹${bus.price.toLocaleString("en-IN")} per seat</p></div>
    <div class="seat-legend"><span><i class="legend"></i> Available</span><span><i class="legend selected"></i> Selected</span><span><i class="legend booked"></i> Booked</span></div>
    <div class="bus-layout"><div class="driver">DRIVER</div><div class="seat-grid">${seats}</div></div>
    <div class="booking-summary"><div><span>Selected Seats</span><strong id="seat-summary">None</strong></div><div><span>Total Fare</span><strong id="seat-total">₹0</strong></div></div>
    <button class="booking-primary" id="continue-seats" type="button" disabled>Continue</button>`;

  modal.classList.add("open");
  document.body.classList.add("modal-open");

  const updateSeatSummary = () => {
    const total = selectedSeats.length * bus.price;
    box.querySelector("#seat-summary").textContent = selectedSeats.length ? selectedSeats.join(", ") : "None";
    box.querySelector("#seat-total").textContent = `₹${total.toLocaleString("en-IN")}`;
    box.querySelector("#continue-seats").disabled = selectedSeats.length === 0;
  };

  box.querySelectorAll(".seat:not(.booked)").forEach(button => {
    button.addEventListener("click", () => {
      const seat = Number(button.dataset.seat);
      if (selectedSeats.includes(seat)) {
        selectedSeats = selectedSeats.filter(s => s !== seat);
        button.classList.remove("selected");
      } else {
        selectedSeats.push(seat);
        selectedSeats.sort((a,b) => a-b);
        button.classList.add("selected");
      }
      updateSeatSummary();
    });
  });

  box.querySelector(".booking-close").addEventListener("click", closeBookingModals);
  box.querySelector("#continue-seats").addEventListener("click", () => {
    closeBookingModals();
    openPassengerModal();
  });
}

function openPassengerModal() {
  injectBookingStyles();
  const modal = ensureModal("passenger-modal");
  const box = modal.querySelector(".booking-box");
  passengerData = selectedSeats.map(seat => ({ seat, name: "", whatsapp: "", sameNumber: seat !== selectedSeats[0] }));

  box.innerHTML = `
    <button class="booking-close" type="button">×</button>
    <div class="booking-head"><p class="booking-step">PASSENGER DETAILS</p><h2>Who is travelling?</h2><p>Enter details for each selected seat.</p></div>
    <div class="passenger-list">
      ${passengerData.map((p, index) => `
        <div class="passenger-card" data-index="${index}">
          <div class="passenger-card-header"><strong>Passenger ${index + 1}</strong><span>Seat ${p.seat}</span></div>
          <div class="passenger-fields">
            <div class="passenger-field"><label>FULL NAME</label><input class="p-name" type="text" autocomplete="name" placeholder="Enter full name"></div>
            <div class="passenger-field"><label>WHATSAPP NUMBER</label><input class="p-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number"></div>
          </div>
          ${index > 0 ? `<label class="same-number"><input class="same-check" type="checkbox" ${p.sameNumber ? "checked" : ""}> Use same WhatsApp number as Passenger 1</label>` : ""}
        </div>`).join("")}
    </div>
    <button class="booking-primary" id="passenger-continue" type="button">Review Booking</button>`;

  modal.classList.add("open");
  document.body.classList.add("modal-open");

  const syncPassengerData = () => {
    box.querySelectorAll(".passenger-card").forEach((card, index) => {
      passengerData[index].name = card.querySelector(".p-name").value.trim();
      passengerData[index].whatsapp = card.querySelector(".p-phone").value.replace(/\D/g, "").slice(0,10);
      const check = card.querySelector(".same-check");
      if (check) passengerData[index].sameNumber = check.checked;
    });
    if (passengerData[0]) {
      box.querySelectorAll(".passenger-card").forEach((card,index) => {
        if (index > 0 && passengerData[index].sameNumber) {
          const input = card.querySelector(".p-phone");
          input.value = passengerData[0].whatsapp;
          passengerData[index].whatsapp = passengerData[0].whatsapp;
          input.disabled = true;
        }
      });
    }
  };

  box.querySelectorAll(".passenger-card").forEach((card,index) => {
    const phone = card.querySelector(".p-phone");
    const check = card.querySelector(".same-check");
    phone.addEventListener("input", syncPassengerData);
    card.querySelector(".p-name").addEventListener("input", syncPassengerData);
    if (check) check.addEventListener("change", () => {
      syncPassengerData();
      phone.disabled = check.checked;
      if (check.checked && passengerData[0]) phone.value = passengerData[0].whatsapp;
      syncPassengerData();
    });
  });
  syncPassengerData();

  box.querySelector(".booking-close").addEventListener("click", () => { closeBookingModals(); openSeatModal(currentBooking.bus); });
  box.querySelector("#passenger-continue").addEventListener("click", () => {
    syncPassengerData();
    const valid = passengerData.every(p => p.name.length >= 2 && /^\d{10}$/.test(p.whatsapp));
    if (!valid) {
      alert("Please enter a valid name and 10-digit WhatsApp number for every passenger.");
      return;
    }
    closeBookingModals();
    openReviewModal();
  });
}

function openReviewModal() {
  injectBookingStyles();
  const modal = ensureModal("review-modal");
  const box = modal.querySelector(".booking-box");
  const bus = currentBooking.bus;
  const total = selectedSeats.length * bus.price;

  box.innerHTML = `
    <button class="booking-close" type="button">×</button>
    <div class="booking-head"><p class="booking-step">BOOKING REVIEW</p><h2>Review your journey</h2><p>Check everything before moving to payment.</p></div>
    <div class="review-card">
      <div class="review-section"><h3>Journey</h3><div class="review-route"><div class="review-place"><strong>${escapeHTML(bus.from)}</strong><span>${escapeHTML(bus.departure)}</span></div><div class="review-arrow">→</div><div class="review-place"><strong>${escapeHTML(bus.to)}</strong><span>${escapeHTML(bus.arrival)}</span></div></div><p style="color:#6d7788;margin:12px 0 0">${escapeHTML(formatDate(currentBooking.date))} • ${escapeHTML(bus.duration)} • ${escapeHTML(bus.name)}</p></div>
      <div class="review-section"><h3>Passengers</h3>${passengerData.map(p => `<div class="review-passenger"><strong>Seat ${p.seat} • ${escapeHTML(p.name)}</strong><span>+91 ${escapeHTML(p.whatsapp)}</span></div>`).join("")}</div>
      <div class="review-section"><h3>Fare Summary</h3><div class="fare-row"><span>${selectedSeats.length} seat${selectedSeats.length > 1 ? "s" : ""} × ₹${bus.price.toLocaleString("en-IN")}</span><strong>₹${total.toLocaleString("en-IN")}</strong></div><div class="fare-row"><span>Taxes & booking fee</span><strong>₹0</strong></div><div class="fare-total"><span>Total</span><span>₹${total.toLocaleString("en-IN")}</span></div></div>
    </div>
    <button class="booking-primary" id="proceed-payment" type="button">Proceed to Payment • ₹${total.toLocaleString("en-IN")}</button>`;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
  box.querySelector(".booking-close").addEventListener("click", closeBookingModals);
  box.querySelector("#proceed-payment").addEventListener("click", () => { closeBookingModals(); openPaymentModal(); });
}

function openPaymentModal() {
  injectBookingStyles();
  const modal = ensureModal("payment-modal");
  const box = modal.querySelector(".booking-box");
  const total = selectedSeats.length * currentBooking.bus.price;

  box.innerHTML = `
    <button class="booking-close" type="button">×</button>
    <div class="booking-head"><p class="booking-step">SECURE PAYMENT</p><h2>Complete your payment</h2><p>Total payable: <strong>₹${total.toLocaleString("en-IN")}</strong></p></div>
    <div class="payment-methods"><button type="button" class="payment-method active" data-method="upi">UPI</button><button type="button" class="payment-method" data-method="card">Card</button><button type="button" class="payment-method" data-method="netbanking">Net Banking</button></div>
    <div class="payment-panel" id="payment-panel"></div>
    <p class="secure-note">Demo payment screen. No real money will be charged at this stage.</p>
    <button class="booking-primary" id="pay-now" type="button">Pay ₹${total.toLocaleString("en-IN")}</button>`;

  modal.classList.add("open");
  document.body.classList.add("modal-open");

  const panel = box.querySelector("#payment-panel");
  const renderPaymentMethod = method => {
    if (method === "upi") {
      panel.innerHTML = `<label>UPI ID</label><div class="upi-row"><input id="upi-id" placeholder="example@upi" autocomplete="off"></div>`;
    } else if (method === "card") {
      panel.innerHTML = `<label>Card Number</label><input id="card-number" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456"><label>Expiry</label><input id="card-expiry" maxlength="5" placeholder="MM/YY"><label>CVV</label><input id="card-cvv" inputmode="numeric" maxlength="3" placeholder="123">`;
    } else {
      panel.innerHTML = `<label>Select Bank</label><select id="bank-select" style="width:100%;height:47px;border:1px solid #dce2e9;border-radius:10px;padding:0 12px;background:#fff"><option value="">Choose your bank</option><option>State Bank of India</option><option>Punjab National Bank</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option></select>`;
    }
  };
  renderPaymentMethod("upi");

  box.querySelectorAll(".payment-method").forEach(button => button.addEventListener("click", () => {
    box.querySelectorAll(".payment-method").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    renderPaymentMethod(button.dataset.method);
  }));

  box.querySelector(".booking-close").addEventListener("click", closeBookingModals);
  box.querySelector("#pay-now").addEventListener("click", () => completeDemoPayment());
}

function completeDemoPayment() {
  const bookingId = `JB${Date.now().toString().slice(-8)}`;
  const modal = ensureModal("payment-modal");
  const box = modal.querySelector(".booking-box");
  const bus = currentBooking.bus;
  const total = selectedSeats.length * bus.price;

  box.innerHTML = `
    <div class="success-box"><div class="success-icon">✓</div><h2>Booking Confirmed</h2><p>Your seat reservation has been created successfully.</p><span class="booking-id">${bookingId}</span></div>
    <div class="review-card" style="margin-top:15px"><div class="review-section"><div class="fare-row"><span>Bus</span><strong>${escapeHTML(bus.name)}</strong></div><div class="fare-row"><span>Journey</span><strong>${escapeHTML(bus.from)} → ${escapeHTML(bus.to)}</strong></div><div class="fare-row"><span>Seats</span><strong>${selectedSeats.join(", ")}</strong></div><div class="fare-row"><span>Amount</span><strong>₹${total.toLocaleString("en-IN")}</strong></div></div></div>
    <button class="booking-primary" id="finish-booking" type="button">Done</button>`;

  box.querySelector("#finish-booking").addEventListener("click", () => {
    closeBookingModals();
    selectedSeats = [];
    passengerData = [];
    currentBooking = null;
  });
}

function closeBookingModals() {
  document.querySelectorAll(".booking-modal").forEach(modal => modal.classList.remove("open"));
  document.body.classList.remove("modal-open");
}

injectBookingStyles();
