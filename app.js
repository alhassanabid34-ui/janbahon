const dateInput = document.getElementById("date");
const today = new Date();

const isoToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().slice(0, 10);

dateInput.min = isoToday;


/* =========================
   BUS DATA
   ========================= */

const buses = [
  {
    operator: "ASTC",
    name: "Mankachar Express",
    type: "AC Seater",
    price: 480,
    departure: "05:30 AM",
    arrival: "01:00 PM",
    duration: "7h 30m",
    seats: 32
  },

  {
    operator: "JANBAHON",
    name: "South Assam Travels",
    type: "Non-AC Seater",
    price: 390,
    departure: "07:30 AM",
    arrival: "03:30 PM",
    duration: "8h",
    seats: 36
  },

  {
    operator: "Assam Roadways",
    name: "Brahmaputra Superfast",
    type: "AC Seater",
    price: 520,
    departure: "09:00 AM",
    arrival: "04:30 PM",
    duration: "7h 30m",
    seats: 40
  },

  {
    operator: "Northeast Travels",
    name: "Barak Valley Express",
    type: "AC Seater",
    price: 560,
    departure: "10:30 AM",
    arrival: "06:30 PM",
    duration: "8h",
    seats: 44
  },

  {
    operator: "JANBAHON",
    name: "Assam Comfort",
    type: "Non-AC Seater",
    price: 350,
    departure: "12:00 PM",
    arrival: "08:30 PM",
    duration: "8h 30m",
    seats: 48
  }
];


/* =========================
   SWAP FROM / TO
   ========================= */

document.getElementById("swap").addEventListener("click", () => {
  const from = document.getElementById("from");
  const to = document.getElementById("to");

  [from.value, to.value] = [to.value, from.value];
});


/* =========================
   POPULAR ROUTES
   ========================= */

document.querySelectorAll(".route-card").forEach(card => {

  card.addEventListener("click", () => {

    document.getElementById("from").value = card.dataset.from;
    document.getElementById("to").value = card.dataset.to;

    document
      .getElementById("booking")
      .scrollIntoView({
        behavior: "smooth"
      });

    document.getElementById("date").focus();
  });

});


/* =========================
   SEARCH BUSES
   ========================= */

document.getElementById("searchForm").addEventListener("submit", event => {

  event.preventDefault();

  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const date = document.getElementById("date").value;

  if (!from || !to || !date) {
    alert("Please select origin, destination and journey date.");
    return;
  }

  if (from === to) {
    alert("Origin and destination cannot be the same.");
    return;
  }


  /* =========================
     FIND AVAILABLE BUSES
     ========================= */

  const availableBuses = buses;


  /* =========================
     RESULTS SECTION
     ========================= */

  const resultsSection = document.getElementById("bus-results");
  const resultsList = document.getElementById("bus-results-list");
  const resultsSummary = document.getElementById("results-summary");

  const formattedDate = new Date(
    date + "T00:00:00"
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });


  resultsSummary.textContent =
    `${from} → ${to} • ${formattedDate} • ${availableBuses.length} bus services found`;


  /* Clear old results */

  resultsList.innerHTML = "";


  /* =========================
     CREATE BUS CARDS
     ========================= */

  availableBuses.forEach(bus => {

    const card = document.createElement("article");

    card.className = "bus-card";

    card.innerHTML = `
      <div class="bus-card-top">

        <div class="bus-operator">
          ${bus.operator}
        </div>

        <div class="bus-price">
          ₹${bus.price}
          <span>per seat</span>
        </div>

      </div>


      <div class="bus-main">

        <div class="bus-info">

          <h3>${bus.name}</h3>

          <p class="bus-type">
            ${bus.type}
          </p>

          <div class="bus-timing">

            <div class="time-point">
              <strong>${bus.departure}</strong>
              <span>${from}</span>
            </div>

            <div class="duration">
              ${bus.duration}
            </div>

            <div class="time-point">
              <strong>${bus.arrival}</strong>
              <span>${to}</span>
            </div>

          </div>

        </div>


        <div class="bus-action">

          <div class="seat-count">
            ${bus.seats} seats available
          </div>

          <button
            class="book-seat"
            type="button"
            data-bus="${bus.name}"
            data-seats="${bus.seats}"
          >
            Book Seat
          </button>

        </div>

      </div>
    `;

    resultsList.appendChild(card);

  });


  /* Scroll to results */

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });


  /* =========================
     BOOK SEAT BUTTONS
     ========================= */

  document.querySelectorAll(".book-seat").forEach(button => {

    button.addEventListener("click", () => {

      const busName = button.dataset.bus;
      const seats = button.dataset.seats;

      alert(
        `${busName}\n\n${seats} seats are currently available.\n\nSeat selection and payment will be connected in the next stage.`
      );

    });

  });

});
