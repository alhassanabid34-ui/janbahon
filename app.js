// ============================================
// JANBAHON BUS BOOKING
// ============================================


// --------------------------------------------
// ELEMENTS
// --------------------------------------------

const searchForm = document.getElementById("searchForm");

const fromInput = document.getElementById("from");

const toInput = document.getElementById("to");

const dateInput = document.getElementById("date");

const swapButton = document.getElementById("swap");

const resultsSection = document.getElementById("bus-results");

const resultsList = document.getElementById("bus-results-list");

const resultsSummary = document.getElementById("results-summary");


// --------------------------------------------
// SET MINIMUM DATE = TODAY
// --------------------------------------------

const today = new Date();

const localToday =
  new Date(
    today.getTime() -
    today.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);

dateInput.min = localToday;


// --------------------------------------------
// SWAP ORIGIN AND DESTINATION
// --------------------------------------------

swapButton.addEventListener("click", () => {

  const oldFrom = fromInput.value;

  const oldTo = toInput.value;

  fromInput.value = oldTo;

  toInput.value = oldFrom;

});


// --------------------------------------------
// POPULAR ROUTES
// --------------------------------------------

document
  .querySelectorAll(".route-card")
  .forEach((card) => {

    card.addEventListener("click", () => {

      fromInput.value = card.dataset.from;

      toInput.value = card.dataset.to;

      resultsSection.scrollIntoView({
        behavior: "smooth"
      });

    });

  });


// --------------------------------------------
// BUS DATABASE
// --------------------------------------------

const buses = [

  // DHUBRI → GUWAHATI

  {
    from: "Dhubri",
    to: "Guwahati",
    operator: "ASTC",
    bus: "Dhubri Express",
    type: "AC Seater",
    departure: "06:30 AM",
    arrival: "12:30 PM",
    duration: "6h",
    fare: 420,
    seats: 18
  },

  {
    from: "Dhubri",
    to: "Guwahati",
    operator: "JANBAHON",
    bus: "Brahmaputra Travels",
    type: "Non-AC Seater",
    departure: "08:00 AM",
    arrival: "02:30 PM",
    duration: "6h 30m",
    fare: 350,
    seats: 27
  },

  {
    from: "Dhubri",
    to: "Guwahati",
    operator: "Assam Roadways",
    bus: "Dhubri - Guwahati Express",
    type: "Non-AC Seater",
    departure: "02:00 PM",
    arrival: "08:30 PM",
    duration: "6h 30m",
    fare: 320,
    seats: 31
  },


  // GUWAHATI → DHUBRI

  {
    from: "Guwahati",
    to: "Dhubri",
    operator: "ASTC",
    bus: "Western Assam Express",
    type: "AC Seater",
    departure: "07:00 AM",
    arrival: "01:00 PM",
    duration: "6h",
    fare: 420,
    seats: 15
  },

  {
    from: "Guwahati",
    to: "Dhubri",
    operator: "JANBAHON",
    bus: "Brahmaputra Travels",
    type: "Non-AC Seater",
    departure: "09:30 AM",
    arrival: "04:00 PM",
    duration: "6h 30m",
    fare: 350,
    seats: 23
  },


  // GUWAHATI → MANKACHAR

  {
    from: "Guwahati",
    to: "Mankachar",
    operator: "ASTC",
    bus: "South Assam Express",
    type: "AC Seater",
    departure: "06:00 AM",
    arrival: "01:30 PM",
    duration: "7h 30m",
    fare: 480,
    seats: 12
  },

  {
    from: "Guwahati",
    to: "Mankachar",
    operator: "JANBAHON",
    bus: "Meghna Travels",
    type: "Non-AC Seater",
    departure: "08:30 AM",
    arrival: "04:30 PM",
    duration: "8h",
    fare: 390,
    seats: 26
  },


  // MANKACHAR → GUWAHATI

  {
    from: "Mankachar",
    to: "Guwahati",
    operator: "ASTC",
    bus: "Mankachar Express",
    type: "AC Seater",
    departure: "05:30 AM",
    arrival: "01:00 PM",
    duration: "7h 30m",
    fare: 480,
    seats: 14
  },

  {
    from: "Mankachar",
    to: "Guwahati",
    operator: "JANBAHON",
    bus: "South Assam Travels",
    type: "Non-AC Seater",
    departure: "07:30 AM",
    arrival: "03:30 PM",
    duration: "8h",
    fare: 390,
    seats: 21
  },


  // HATSINGIMARI → GUWAHATI

  {
    from: "Hatsingimari",
    to: "Guwahati",
    operator: "ASTC",
    bus: "Hatsingimari Express",
    type: "AC Seater",
    departure: "06:15 AM",
    arrival: "01:15 PM",
    duration: "7h",
    fare: 450,
    seats: 16
  },

  {
    from: "Hatsingimari",
    to: "Guwahati",
    operator: "JANBAHON",
    bus: "South Bank Travels",
    type: "Non-AC Seater",
    departure: "09:00 AM",
    arrival: "04:30 PM",
    duration: "7h 30m",
    fare: 380,
    seats: 24
  },


  // GUWAHATI → HATSINGIMARI

  {
    from: "Guwahati",
    to: "Hatsingimari",
    operator: "ASTC",
    bus: "Hatsingimari Express",
    type: "AC Seater",
    departure: "07:15 AM",
    arrival: "02:15 PM",
    duration: "7h",
    fare: 450,
    seats: 11
  },

  {
    from: "Guwahati",
    to: "Hatsingimari",
    operator: "JANBAHON",
    bus: "South Bank Travels",
    type: "Non-AC Seater",
    departure: "10:00 AM",
    arrival: "05:30 PM",
    duration: "7h 30m",
    fare: 380,
    seats: 28
  }

];


// --------------------------------------------
// SEARCH BUS
// --------------------------------------------

searchForm.addEventListener("submit", (event) => {

  event.preventDefault();


  const from = fromInput.value;

  const to = toInput.value;

  const date = dateInput.value;


  // Check origin

  if (!from) {

    alert("Please select your starting point.");

    fromInput.focus();

    return;

  }


  // Check destination

  if (!to) {

    alert("Please select your destination.");

    toInput.focus();

    return;

  }


  // Check same location

  if (from === to) {

    alert(
      "Origin and destination cannot be the same."
    );

    return;

  }


  // Check date

  if (!date) {

    alert("Please select your journey date.");

    dateInput.focus();

    return;

  }


  // Find buses

  const matchingBuses = buses.filter((bus) => {

    return (
      bus.from === from &&
      bus.to === to
    );

  });


  // Display results

  displayResults(
    matchingBuses,
    from,
    to,
    date
  );

});


// --------------------------------------------
// DISPLAY BUS RESULTS
// --------------------------------------------

function displayResults(
  matchingBuses,
  from,
  to,
  date
) {

  resultsList.innerHTML = "";


  // Format date

  const formattedDate =
    formatDate(date);


  // Update heading

  resultsSummary.textContent =
    `${from} → ${to} • ${formattedDate} • ${matchingBuses.length} bus service${matchingBuses.length === 1 ? "" : "s"} found`;


  // No buses

  if (matchingBuses.length === 0) {

    resultsList.innerHTML = `

      <div class="empty-results">

        <h3>
          No buses found
        </h3>

        <p>
          We currently do not have a bus service listed for
          ${from} → ${to}.
        </p>

        <p>
          Please try another route.
        </p>

      </div>

    `;

    resultsSection.scrollIntoView({
      behavior: "smooth"
    });

    return;

  }


  // Create bus cards

  matchingBuses.forEach((bus, index) => {

    const card = document.createElement("div");

    card.className = "bus-card";


    card.innerHTML = `

      <div class="bus-card-top">

        <div>

          <p class="bus-operator">
            ${bus.operator}
          </p>

          <h3>
            ${bus.bus}
          </h3>

          <p class="bus-type">
            ${bus.type}
          </p>

        </div>

        <div class="bus-price">
          <span>₹</span>${bus.fare}
          <small>per seat</small>
        </div>

      </div>


      <div class="bus-timing">

        <div class="time-block">

          <strong>
            ${bus.departure}
          </strong>

          <span>
            ${bus.from}
          </span>

        </div>


        <div class="journey-line">

          <span>
            ${bus.duration}
          </span>

          <div></div>

        </div>


        <div class="time-block arrival">

          <strong>
            ${bus.arrival}
          </strong>

          <span>
            ${bus.to}
          </span>

        </div>

      </div>


      <div class="bus-card-bottom">

        <span class="seats">
          ${bus.seats} seats available
        </span>

        <button
          class="book-btn"
          data-bus="${index}"
        >
          Book Seat
        </button>

      </div>

    `;


    resultsList.appendChild(card);

  });


  // Book buttons

  document
    .querySelectorAll(".book-btn")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const busIndex =
          Number(button.dataset.bus);

        const selectedBus =
          matchingBuses[busIndex];


        alert(

          `Booking selected!\n\n` +

          `${selectedBus.bus}\n` +

          `${selectedBus.from} → ${selectedBus.to}\n` +

          `${selectedBus.departure} - ${selectedBus.arrival}\n\n` +

          `Fare: ₹${selectedBus.fare}\n\n` +

          `Online passenger booking will be connected in the next stage.`

        );

      });

    });


  // Scroll to results

  resultsSection.scrollIntoView({
    behavior: "smooth"
  });

}


// --------------------------------------------
// FORMAT DATE
// --------------------------------------------

function formatDate(dateString) {

  const date =
    new Date(
      dateString + "T00:00:00"
    );


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}
