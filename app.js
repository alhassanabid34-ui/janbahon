const dateInput = document.getElementById("date");
const today = new Date();

const isoToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
)
  .toISOString()
  .slice(0, 10);

dateInput.min = isoToday;


/* =========================================================
   SAMPLE BUS DATA
   ========================================================= */

const buses = [
  {
    from: "Mankachar",
    to: "Guwahati",
    operator: "ASTC",
    name: "Mankachar Express",
    type: "AC Seater",
    price: 480,
    departure: "05:30 AM",
    arrival: "01:00 PM",
    duration: "7h 30m",
    seats: 14
  },

  {
    from: "Mankachar",
    to: "Guwahati",
    operator: "JANBAHON",
    name: "South Assam Travels",
    type: "Non-AC Seater",
    price: 390,
    departure: "07:30 AM",
    arrival: "03:30 PM",
    duration: "8h",
    seats: 21
  },

  {
    from: "Guwahati",
    to: "Mankachar",
    operator: "JANBAHON",
    name: "Brahmaputra Express",
    type: "AC Seater",
    price: 450,
    departure: "06:00 AM",
    arrival: "01:45 PM",
    duration: "7h 45m",
    seats: 17
  },

  {
    from: "Dhubri",
    to: "Guwahati",
    operator: "ASTC",
    name: "Dhubri Express",
    type: "Non-AC Seater",
    price: 350,
    departure: "06:30 AM",
    arrival: "01:30 PM",
    duration: "7h",
    seats: 18
  },

  {
    from: "Guwahati",
    to: "Dhubri",
    operator: "JANBAHON",
    name: "Dhubri Superfast",
    type: "AC Seater",
    price: 430,
    departure: "07:00 AM",
    arrival: "02:00 PM",
    duration: "7h",
    seats: 12
  },

  {
    from: "Hatsingimari",
    to: "Guwahati",
    operator: "ASTC",
    name: "Hatsingimari Express",
    type: "Non-AC Seater",
    price: 410,
    departure: "06:15 AM",
    arrival: "02:15 PM",
    duration: "8h",
    seats: 16
  }
];


/* =========================================================
   SWAP BUTTON
   ========================================================= */

document.getElementById("swap").addEventListener("click", () => {

  const from = document.getElementById("from");
  const to = document.getElementById("to");

  const temp = from.value;

  from.value = to.value;
  to.value = temp;
});


/* =========================================================
   POPULAR ROUTE BUTTONS
   ========================================================= */

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


/* =========================================================
   SEARCH BUS
   ========================================================= */

document
  .getElementById("searchForm")
  .addEventListener("submit", function(event) {

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

    const matchingBuses = buses.filter(bus =>
      bus.from === from &&
      bus.to === to
    );

    displayResults(
      matchingBuses,
      from,
      to,
      date
    );

  });


/* =========================================================
   DISPLAY BUS RESULTS
   ========================================================= */

function displayResults(
  matchingBuses,
  from,
  to,
  date
) {

  const resultsSection =
    document.getElementById("bus-results");

  const resultsList =
    document.getElementById("bus-results-list");

  const summary =
    document.getElementById("results-summary");


  /* Format date */

  const formattedDate =
    new Date(date + "T00:00:00").toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );


  /* Update heading */

  summary.textContent =
    `${from} → ${to} • ${formattedDate} • ${matchingBuses.length} bus service${matchingBuses.length !== 1 ? "s" : ""} found`;


  /* Clear previous results */

  resultsList.innerHTML = "";


  /* No buses */

  if (matchingBuses.length === 0) {

    resultsList.innerHTML = `
      <div class="empty-results">
        <h3>No buses found</h3>
        <p>
          We could not find a bus for this route yet.
          Please try another route or date.
        </p>
      </div>
    `;

  } else {

    matchingBuses.forEach(bus => {

      const card = document.createElement("article");

      card.className = "bus-card";


      card.innerHTML = `

        <div class="bus-operator">

          <small>${bus.operator}</small>

          <h3>${bus.name}</h3>

          <div class="bus-type">
            ${bus.type}
          </div>

          <div class="bus-price">
            ₹${bus.price} per seat
          </div>

        </div>


        <div class="bus-journey">

          <div>
            <span class="bus-time">
              ${bus.departure}
            </span>

            <span class="bus-place">
              ${bus.from}
            </span>
          </div>

          <div class="bus-duration">
            ${bus.duration}
          </div>

          <div>
            <span class="bus-time">
              ${bus.arrival}
            </span>

            <span class="bus-place">
              ${bus.to}
            </span>
          </div>

        </div>


        <div>

          <div class="bus-seats">
            ${bus.seats} seats available
          </div>

        </div>


        <div class="bus-action">

          <button
            class="book-seat"
            type="button"
            data-bus="${bus.name}"
          >
            Book Seat
          </button>

        </div>

      `;


      resultsList.appendChild(card);

    });


    /* Book buttons */

    document
      .querySelectorAll(".book-seat")
      .forEach(button => {

        button.addEventListener("click", () => {

          const busName =
            button.dataset.bus;

          alert(
            `Booking for ${busName} will be connected in the next stage.`
          );

        });

      });

  }


  /* Scroll to results */

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}
