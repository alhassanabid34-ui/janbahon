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
   SEAT MODAL
   Multi-seat selection + 2+1 layout.
   The two seats are attached together on the RIGHT side,
   while the single seat is on the LEFT side.
   ========================================================= */
let activeBus = null;
let selectedSeats = new Set();
let seatModal = null;

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
  seatModal.querySelector("#continue-booking").addEventListener("click", () => {
    if (!activeBus || selectedSeats.size === 0) return;
    const seats = [...selectedSeats].sort((a, b) => a - b).join(", ");
    alert(`Seats ${seats} selected on ${activeBus.name}.\n\nTotal fare: ₹${(selectedSeats.size * activeBus.price).toLocaleString("en-IN")}\n\nNext step: passenger details and payment.`);
  });
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

    /* 2+1 layout: single seat LEFT, two attached seats RIGHT. */
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

  if (selectedSeats.has(seatNumber)) {
    selectedSeats.delete(seatNumber);
  } else {
    selectedSeats.add(seatNumber);
  }

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

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && seatModal?.classList.contains("open")) closeSeatModal();
});
