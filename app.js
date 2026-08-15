const dateInput = document.getElementById("date");
const searchForm = document.getElementById("searchForm");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const resultsSection = document.getElementById("bus-results");
const resultsList = document.getElementById("bus-results-list");
const resultsSummary = document.getElementById("results-summary");

/* =========================================================
   JANBAHON BUS DATA
   Total seats are deliberately different for every service:
   32 / 40 / 44 / 36 / 48.
   ========================================================= */
const buses = [
  { id: "astc-mankachar-express", operator: "ASTC", name: "Mankachar Express", type: "AC Seater", price: 480, from: "Mankachar", to: "Guwahati", departure: "05:30 AM", arrival: "01:00 PM", duration: "7h 30m", seats: 32 },
  { id: "janbahon-south-assam", operator: "JANBAHON", name: "South Assam Travels", type: "Non-AC Seater", price: 390, from: "Mankachar", to: "Guwahati", departure: "07:30 AM", arrival: "03:30 PM", duration: "8h", seats: 40 },
  { id: "assam-roadways-brahmaputra", operator: "Assam Roadways", name: "Brahmaputra Superfast", type: "AC Seater", price: 520, from: "Mankachar", to: "Guwahati", departure: "06:15 AM", arrival: "01:45 PM", duration: "7h 30m", seats: 44 },
  { id: "janbahon-barak-valley", operator: "JANBAHON", name: "Barak Valley Express", type: "Non-AC Seater", price: 360, from: "Mankachar", to: "Guwahati", departure: "08:00 AM", arrival: "04:30 PM", duration: "8h 30m", seats: 36 },
  { id: "northeast-night-rider", operator: "Northeast Travels", name: "Assam Night Rider", type: "AC Seater", price: 550, from: "Mankachar", to: "Guwahati", departure: "09:00 PM", arrival: "05:30 AM", duration: "8h 30m", seats: 48 }
];

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
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResults(matches, from, to, date) {
  resultsList.innerHTML = "";

  if (!matches.length) {
    resultsSummary.textContent = `${from} → ${to} • ${formatDate(date)} • No buses found`;
    resultsList.innerHTML = `
      <div class="empty-results">
        <div class="empty-results-icon">⌕</div>
        <h3>No buses found for this route</h3>
        <p>Try another route or check the journey date.</p>
      </div>`;
    return;
  }

  resultsSummary.textContent = `${from} → ${to} • ${formatDate(date)} • ${matches.length} buses found`;

  matches.forEach(bus => {
    const card = document.createElement("article");
    card.className = "bus-card";
    card.innerHTML = `
      <div class="bus-operator-block">
        <div class="bus-operator">${escapeHTML(bus.operator)}</div>
      </div>
      <div class="bus-info">
        <h3>${escapeHTML(bus.name)}</h3>
        <p class="bus-type">${escapeHTML(bus.type)}</p>
        <p class="bus-price">₹${bus.price.toLocaleString("en-IN")} <span>per seat</span></p>
      </div>
      <div class="bus-journey-line">
        <div class="journey-point">
          <strong>${escapeHTML(bus.from)}</strong>
          <span>${escapeHTML(bus.departure)}</span>
        </div>
        <div class="journey-track" aria-hidden="true">
          <span class="track-dot"></span>
          <span class="track-line"></span>
          <span class="bus-icon">▣</span>
          <span class="track-line"></span>
          <span class="track-dot"></span>
          <small>${escapeHTML(bus.duration)}</small>
        </div>
        <div class="journey-point journey-arrival">
          <strong>${escapeHTML(bus.to)}</strong>
          <span>${escapeHTML(bus.arrival)}</span>
        </div>
      </div>
      <div class="bus-action">
        <span class="bus-seats">${bus.seats} seats</span>
        <button class="book-seat" type="button">Book Seat</button>
      </div>`;

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

/* =========================================================
   MODAL STYLES
   Passenger and seat styles are injected here so the flow
   works without changing the existing page structure.
   ========================================================= */
function injectBookingStyles() {
  if (document.getElementById("janbahon-booking-styles")) return;

  const style = document.createElement("style");
  style.id = "janbahon-booking-styles";
  style.textContent = `
    body.modal-open { overflow: hidden; }

    .seat-overlay,
    .passenger-overlay {
      position: fixed;
      inset: 0;
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(6, 31, 67, 0.72);
      backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      overflow-y: auto;
    }

    #seat-modal.open .seat-overlay,
    #passenger-modal.open .passenger-overlay {
      opacity: 1;
      pointer-events: auto;
    }

    .seat-modal-box,
    .passenger-modal-box {
      position: relative;
      width: min(100%, 760px);
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 34px;
      background: #fff;
      border-radius: 26px;
      box-shadow: 0 25px 80px rgba(0,0,0,.25);
      transform: translateY(12px);
      transition: transform .2s ease;
    }

    #seat-modal.open .seat-modal-box,
    #passenger-modal.open .passenger-modal-box {
      transform: translateY(0);
    }

    .close-seat-modal,
    .close-passenger-modal {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 50%;
      background: #f0f3f7;
      color: #082b5c;
      font-size: 26px;
      line-height: 1;
    }

    .close-seat-modal:hover,
    .close-passenger-modal:hover { background: #e5eaf0; }

    .seat-modal-header,
    .passenger-header { text-align: center; padding: 0 40px; }
    .seat-modal-label,
    .passenger-step {
      margin: 0 0 8px;
      color: #f47b20;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 2.5px;
    }
    .seat-modal-header h2,
    .passenger-header h2 {
      margin: 0;
      color: #082b5c;
      font-size: clamp(25px, 5vw, 34px);
    }
    .seat-modal-header p:last-child,
    .passenger-header > p:last-child { color: #6d7788; margin: 8px 0 0; }

    .seat-legend {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 18px;
      margin: 28px 0 18px;
      color: #6d7788;
      font-size: 13px;
    }
    .seat-legend span { display: inline-flex; align-items: center; gap: 7px; }
    .legend { width: 16px; height: 16px; border-radius: 5px; border: 1px solid #d9e0e8; background: #fff; display: inline-block; }
    .legend.selected { background: #16824b; border-color: #16824b; }
    .legend.booked { background: #d9dee6; border-color: #d9dee6; }

    .bus-layout {
      width: min(100%, 420px);
      margin: 0 auto;
      padding: 18px;
      border: 1px solid #dce2e9;
      border-radius: 24px;
      background: #f8fafc;
    }
    .driver {
      width: 100%;
      padding: 10px;
      margin-bottom: 18px;
      text-align: right;
      border-radius: 10px;
      background: #e8edf3;
      color: #6d7788;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .seat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .seat {
      min-height: 52px;
      border: 2px solid #dfe5eb;
      border-radius: 11px;
      background: #fff;
      color: #082b5c;
      font-weight: 800;
      transition: .15s ease;
    }
    .seat:hover:not(:disabled) { border-color: #16824b; transform: translateY(-1px); }
    .seat.selected { background: #16824b; border-color: #16824b; color: #fff; }
    .seat.booked { background: #d9dee6; border-color: #d9dee6; color: #8b95a4; cursor: not-allowed; }
    .seat.single-left-seat { grid-column: 1; }
    .seat.right-pair-seat { grid-column: auto; }

    .booking-summary {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 20px;
      padding: 18px 20px;
      background: #f5f7fa;
      border-radius: 16px;
    }
    .booking-summary div { min-width: 0; }
    .booking-summary span { display: block; color: #7b8798; font-size: 12px; margin-bottom: 4px; }
    .booking-summary strong { color: #082b5c; font-size: 16px; word-break: break-word; }

    .continue-booking,
    .passenger-submit {
      width: 100%;
      min-height: 52px;
      margin-top: 18px;
      border: 0;
      border-radius: 12px;
      background: #f47b20;
      color: #fff;
      font-weight: 800;
      font-size: 16px;
    }
    .continue-booking:hover:not(:disabled),
    .passenger-submit:hover:not(:disabled) { background: #d96512; }
    .continue-booking:disabled,
    .passenger-submit:disabled { background: #cbd2db; cursor: not-allowed; }

    .passenger-modal-box { width: min(100%, 820px); }
    .passenger-list { display: grid; gap: 14px; margin-top: 26px; }
    .passenger-card {
      padding: 20px;
      border: 1px solid #e1e6ed;
      border-radius: 16px;
      background: #fff;
    }
    .passenger-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .passenger-card-header strong { color: #082b5c; font-size: 17px; }
    .passenger-card-header span {
      padding: 5px 9px;
      border-radius: 999px;
      background: #fff4ea;
      color: #d96512;
      font-size: 11px;
      font-weight: 800;
    }
    .passenger-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .passenger-field { display: flex; flex-direction: column; gap: 7px; }
    .passenger-field label { color: #082b5c; font-size: 12px; font-weight: 800; }
    .passenger-field input {
      width: 100%;
      min-height: 48px;
      padding: 0 13px;
      border: 1px solid #dce2e9;
      border-radius: 10px;
      outline: none;
      color: #172033;
      background: #fff;
    }
    .passenger-field input:focus { border-color: #f47b20; box-shadow: 0 0 0 3px rgba(244,123,32,.12); }
    .passenger-field input:disabled { background: #f1f4f7; color: #7b8798; }
    .same-number {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 11px;
      color: #536073;
      font-size: 12px;
      cursor: pointer;
    }
    .same-number input { accent-color: #16824b; }
    .passenger-error {
      margin: 12px 0 0;
      color: #c5362f;
      font-size: 12px;
      font-weight: 700;
    }
    .passenger-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
      padding: 17px 20px;
      border-radius: 15px;
      background: #f5f7fa;
      color: #082b5c;
    }
    .passenger-total small { color: #6d7788; }
    .passenger-total strong { font-size: 20px; }
    .passenger-back {
      width: 100%;
      min-height: 46px;
      margin-top: 10px;
      border: 1px solid #dce2e9;
      border-radius: 11px;
      background: #fff;
      color: #082b5c;
      font-weight: 800;
    }
    .passenger-back:hover { background: #f5f7fa; }

    @media (max-width: 650px) {
      .seat-overlay,
      .passenger-overlay { align-items: flex-start; padding: 10px; }
      .seat-modal-box,
      .passenger-modal-box { max-height: calc(100vh - 20px); padding: 24px 16px; border-radius: 20px; }
      .seat-modal-header, .passenger-header { padding: 0 28px; }
      .seat-grid { gap: 7px; }
      .seat { min-height: 47px; }
      .booking-summary { flex-direction: column; gap: 12px; }
      .passenger-fields { grid-template-columns: 1fr; }
      .passenger-card { padding: 16px; }
    }
  `;
  document.head.appendChild(style);
}

injectBookingStyles();

/* =========================================================
   SEAT MODAL
   Multi-seat selection + 2+1 layout.
   ========================================================= */
let activeBus = null;
let selectedSeats = new Set();
let seatModal = null;
let passengerModal = null;
let passengerDetails = {};

function createSeatModal() {
  if (document.getElementById("seat-modal")) return;

  seatModal = document.createElement("div");
  seatModal.id = "seat-modal";
  seatModal.innerHTML = `
    <div class="seat-overlay" role="dialog" aria-modal="true" aria-label="Seat selection">
      <div class="seat-modal-box">
        <button class="close-seat-modal" type="button" aria-label="Close">×</button>
        <div class="seat-modal-header">
          <p class="seat-modal-label">SELECT YOUR SEATS</p>
          <h2 id="seat-bus-name"></h2>
          <p id="seat-bus-meta"></p>
        </div>
        <div class="seat-legend">
          <span><i class="legend available"></i> Available</span>
          <span><i class="legend selected"></i> Selected</span>
          <span><i class="legend booked"></i> Booked</span>
        </div>
        <div class="bus-layout">
          <div class="driver">DRIVER</div>
          <div class="seat-grid" id="modal-seat-grid"></div>
        </div>
        <div class="booking-summary">
          <div>
            <span>Selected Seats</span>
            <strong id="modal-selected-seat">None</strong>
          </div>
          <div>
            <span>Total Fare</span>
            <strong id="modal-total-fare">₹0</strong>
          </div>
        </div>
        <button class="continue-booking" id="continue-booking" type="button" disabled>Continue</button>
      </div>
    </div>`;

  document.body.appendChild(seatModal);

  seatModal.querySelector(".close-seat-modal").addEventListener("click", closeSeatModal);
  seatModal.querySelector(".seat-overlay").addEventListener("click", event => {
    if (event.target.classList.contains("seat-overlay")) closeSeatModal();
  });
  seatModal.querySelector("#continue-booking").addEventListener("click", openPassengerModal);
}

function getBookedSeats(bus) {
  const count = Math.max(3, Math.floor(bus.seats * 0.18));
  const booked = new Set();
  let seed = bus.seats + bus.price;

  while (booked.size < count) {
    seed = (seed * 9301 + 49297) % 233280;
    const seat = Math.floor((seed / 233280) * bus.seats) + 1;
    booked.add(seat);
  }
  return booked;
}

function openSeatModal(bus) {
  createSeatModal();
  activeBus = bus;
  selectedSeats = new Set();
  passengerDetails = {};

  document.getElementById("seat-bus-name").textContent = bus.name;
  document.getElementById("seat-bus-meta").textContent = `${bus.type} • ₹${bus.price.toLocaleString("en-IN")} per seat • ${bus.seats} total seats`;

  renderSeatGrid(bus);
  updateSeatSummary();

  seatModal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeSeatModal() {
  if (!seatModal) return;
  seatModal.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function renderSeatGrid(bus) {
  const grid = document.getElementById("modal-seat-grid");
  grid.innerHTML = "";
  const bookedSeats = getBookedSeats(bus);

  for (let seatNumber = 1; seatNumber <= bus.seats; seatNumber++) {
    const seat = document.createElement("button");
    seat.type = "button";
    seat.className = "seat";
    seat.textContent = seatNumber;
    seat.setAttribute("aria-label", `Seat ${seatNumber}`);

    /* 2+1 layout: single seat LEFT, two seats RIGHT. */
    const position = (seatNumber - 1) % 3;
    if (position === 0) seat.classList.add("single-left-seat");
    else seat.classList.add("right-pair-seat");

    if (bookedSeats.has(seatNumber)) {
      seat.classList.add("booked");
      seat.disabled = true;
    } else {
      seat.addEventListener("click", () => toggleSeat(seatNumber));
    }

    grid.appendChild(seat);
  }
}

function toggleSeat(seatNumber) {
  if (!activeBus) return;

  if (selectedSeats.has(seatNumber)) selectedSeats.delete(seatNumber);
  else selectedSeats.add(seatNumber);

  const selectedButton = [...document.querySelectorAll("#modal-seat-grid .seat")]
    .find(button => Number(button.textContent) === seatNumber);

  selectedButton?.classList.toggle("selected", selectedSeats.has(seatNumber));
  updateSeatSummary();
}

function updateSeatSummary() {
  if (!activeBus) return;

  const seats = [...selectedSeats].sort((a, b) => a - b);
  const selectedText = seats.length ? seats.map(seat => `Seat ${seat}`).join(", ") : "None";
  const total = seats.length * activeBus.price;

  document.getElementById("modal-selected-seat").textContent = selectedText;
  document.getElementById("modal-total-fare").textContent = `₹${total.toLocaleString("en-IN")}`;
  document.getElementById("continue-booking").disabled = seats.length === 0;
}

/* =========================================================
   PASSENGER DETAILS
   Only two details are collected:
   1. Passenger name
   2. WhatsApp number

   For seats 2+, a checkbox lets the passenger reuse the
   first passenger's WhatsApp number.
   ========================================================= */
function createPassengerModal() {
  if (document.getElementById("passenger-modal")) return;

  passengerModal = document.createElement("div");
  passengerModal.id = "passenger-modal";
  passengerModal.innerHTML = `
    <div class="passenger-overlay" role="dialog" aria-modal="true" aria-label="Passenger details">
      <div class="passenger-modal-box">
        <button class="close-passenger-modal" type="button" aria-label="Close">×</button>
        <div class="passenger-header">
          <p class="passenger-step">STEP 2 OF 3</p>
          <h2>Passenger Details</h2>
          <p id="passenger-route-summary">Enter details for each selected seat.</p>
        </div>
        <form id="passenger-form" novalidate>
          <div id="passenger-list" class="passenger-list"></div>
          <div class="passenger-total">
            <div><small id="passenger-seat-count"></small><br><strong>Total Fare</strong></div>
            <strong id="passenger-total-fare">₹0</strong>
          </div>
          <p id="passenger-error" class="passenger-error" hidden></p>
          <button class="passenger-submit" type="submit">Continue to Booking Review</button>
          <button class="passenger-back" id="passenger-back" type="button">Back to Seat Selection</button>
        </form>
      </div>
    </div>`;

  document.body.appendChild(passengerModal);

  passengerModal.querySelector(".close-passenger-modal").addEventListener("click", closePassengerModal);
  passengerModal.querySelector(".passenger-overlay").addEventListener("click", event => {
    if (event.target.classList.contains("passenger-overlay")) closePassengerModal();
  });
  passengerModal.querySelector("#passenger-back").addEventListener("click", () => {
    closePassengerModal();
    seatModal?.classList.add("open");
    document.body.classList.add("modal-open");
  });
  passengerModal.querySelector("#passenger-form").addEventListener("submit", submitPassengerDetails);
}

function openPassengerModal() {
  if (!activeBus || selectedSeats.size === 0) return;

  createPassengerModal();
  closeSeatModal();

  const seats = [...selectedSeats].sort((a, b) => a - b);
  const oldDetails = passengerDetails;
  const list = document.getElementById("passenger-list");
  list.innerHTML = "";

  document.getElementById("passenger-route-summary").textContent = `${activeBus.name} • ${activeBus.from} → ${activeBus.to}`;
  document.getElementById("passenger-seat-count").textContent = `${seats.length} ${seats.length === 1 ? "seat" : "seats"} selected`;
  document.getElementById("passenger-total-fare").textContent = `₹${(seats.length * activeBus.price).toLocaleString("en-IN")}`;
  document.getElementById("passenger-error").hidden = true;

  seats.forEach((seatNumber, index) => {
    const previous = oldDetails[seatNumber] || {};
    const card = document.createElement("div");
    card.className = "passenger-card";
    card.dataset.seat = seatNumber;

    card.innerHTML = `
      <div class="passenger-card-header">
        <strong>Passenger for Seat ${seatNumber}</strong>
        <span>${index === 0 ? "PRIMARY" : "PASSENGER"}</span>
      </div>
      <div class="passenger-fields">
        <div class="passenger-field">
          <label for="passenger-name-${seatNumber}">Full Name</label>
          <input id="passenger-name-${seatNumber}" name="name-${seatNumber}" type="text" autocomplete="name" placeholder="Enter passenger name" value="${escapeHTML(previous.name || "")}" required>
        </div>
        <div class="passenger-field">
          <label for="passenger-whatsapp-${seatNumber}">WhatsApp Number</label>
          <input id="passenger-whatsapp-${seatNumber}" name="whatsapp-${seatNumber}" class="whatsapp-input" type="tel" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="10-digit WhatsApp number" value="${escapeHTML(previous.whatsapp || "")}" required>
        </div>
      </div>
      ${index > 0 ? `
        <label class="same-number">
          <input class="same-whatsapp" type="checkbox" ${previous.sameAsFirst ? "checked" : ""}>
          Use the same WhatsApp number as Passenger 1
        </label>` : `
        <p style="margin:10px 0 0;color:#7b8798;font-size:12px;">This is the main WhatsApp number for the booking.</p>`}
      <p class="passenger-error" hidden></p>`;

    list.appendChild(card);
  });

  wirePassengerNumberSync();
  passengerModal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closePassengerModal() {
  if (!passengerModal) return;
  passengerModal.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function wirePassengerNumberSync() {
  const cards = [...document.querySelectorAll("#passenger-list .passenger-card")];
  if (!cards.length) return;

  const firstNumber = cards[0].querySelector(".whatsapp-input");

  firstNumber.addEventListener("input", () => {
    firstNumber.value = firstNumber.value.replace(/\D/g, "").slice(0, 10);
    cards.slice(1).forEach(card => {
      const checkbox = card.querySelector(".same-whatsapp");
      const input = card.querySelector(".whatsapp-input");
      if (checkbox?.checked) input.value = firstNumber.value;
    });
  });

  cards.slice(1).forEach(card => {
    const checkbox = card.querySelector(".same-whatsapp");
    const input = card.querySelector(".whatsapp-input");

    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 10);
    });

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        input.value = firstNumber.value;
        input.disabled = true;
      } else {
        input.disabled = false;
      }
    });

    if (checkbox.checked) {
      input.value = firstNumber.value || input.value;
      input.disabled = true;
    }
  });
}

function submitPassengerDetails(event) {
  event.preventDefault();
  if (!activeBus) return;

  const cards = [...document.querySelectorAll("#passenger-list .passenger-card")];
  const firstWhatsapp = cards[0]?.querySelector(".whatsapp-input")?.value.trim() || "";
  const details = {};
  let valid = true;

  cards.forEach(card => {
    const seatNumber = Number(card.dataset.seat);
    const nameInput = card.querySelector("input[name^='name-']");
    const whatsappInput = card.querySelector(".whatsapp-input");
    const sameCheckbox = card.querySelector(".same-whatsapp");
    const error = card.querySelector(".passenger-error");

    const name = nameInput.value.trim();
    const whatsapp = sameCheckbox?.checked ? firstWhatsapp : whatsappInput.value.trim();
    const errors = [];

    if (name.length < 2) errors.push("Enter the passenger's name.");
    if (!/^[6-9]\d{9}$/.test(whatsapp)) errors.push("Enter a valid 10-digit WhatsApp number.");

    if (errors.length) {
      valid = false;
      error.textContent = errors.join(" ");
      error.hidden = false;
    } else {
      error.hidden = true;
      details[seatNumber] = {
        name,
        whatsapp,
        sameAsFirst: Boolean(sameCheckbox?.checked)
      };
    }
  });

  const globalError = document.getElementById("passenger-error");
  globalError.hidden = true;

  if (!valid) {
    globalError.textContent = "Please complete all passenger details before continuing.";
    globalError.hidden = false;
    return;
  }

  passengerDetails = details;

  const seats = [...selectedSeats].sort((a, b) => a - b);
  const summary = seats.map(seat => `Seat ${seat}: ${details[seat].name}`).join("\n");
  const total = seats.length * activeBus.price;

  alert(`Passenger details saved.\n\n${summary}\n\nTotal fare: ₹${total.toLocaleString("en-IN")}\n\nBooking review and payment will be the next stage.`);
}

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (passengerModal?.classList.contains("open")) closePassengerModal();
  else if (seatModal?.classList.contains("open")) closeSeatModal();
});
