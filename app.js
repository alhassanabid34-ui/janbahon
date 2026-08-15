/* =========================================================
   JANBAHON — BUS BOOKING APPLICATION
   ========================================================= */

const dateInput = document.getElementById("date");
const today = new Date();

const isoToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
)
  .toISOString()
  .slice(0, 10);

dateInput.min = isoToday;


/* =========================================================
   BUS DATA
   Different buses have different seat capacities
   Minimum: 32
   Maximum: 48
   ========================================================= */

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
    seats: 40
  },

  {
    operator: "Assam Roadways",
    name: "Brahmaputra Superfast",
    type: "AC Seater",
    price: 520,
    departure: "06:15 AM",
    arrival: "01:45 PM",
    duration: "7h 30m",
    seats: 44
  },

  {
    operator: "JANBAHON",
    name: "Barak Valley Express",
    type: "Non-AC Seater",
    price: 360,
    departure: "08:00 AM",
    arrival: "04:30 PM",
    duration: "8h 30m",
    seats: 36
  },

  {
    operator: "Northeast Travels",
    name: "Assam Night Rider",
    type: "AC Seater",
    price: 550,
    departure: "09:00 PM",
    arrival: "05:30 AM",
    duration: "8h 30m",
    seats: 48
  }

];


/* =========================================================
   ROUTE BUTTONS
   ========================================================= */

document.querySelectorAll(".route-card").forEach(card => {

  card.addEventListener("click", () => {

    document.getElementById("from").value =
      card.dataset.from;

    document.getElementById("to").value =
      card.dataset.to;

    document.getElementById("booking").scrollIntoView({
      behavior: "smooth"
    });

    dateInput.focus();

  });

});


/* =========================================================
   SWAP BUTTON
   ========================================================= */

document.getElementById("swap").addEventListener("click", () => {

  const from = document.getElementById("from");
  const to = document.getElementById("to");

  const temporary = from.value;

  from.value = to.value;
  to.value = temporary;

});


/* =========================================================
   SEARCH BUS
   ========================================================= */

document
  .getElementById("searchForm")
  .addEventListener("submit", function(event) {

    event.preventDefault();

    const from =
      document.getElementById("from").value;

    const to =
      document.getElementById("to").value;

    const date =
      document.getElementById("date").value;

    if (!from || !to || !date) {

      alert("Please select origin, destination and journey date.");

      return;
    }


    if (from === to) {

      alert("Origin and destination cannot be the same.");

      return;
    }


    displayBuses(from, to, date);

  });


/* =========================================================
   DISPLAY BUS RESULTS
   ========================================================= */

function displayBuses(from, to, date) {

  const resultsSection =
    document.getElementById("bus-results");

  const resultsList =
    document.getElementById("bus-results-list");

  const resultsSummary =
    document.getElementById("results-summary");


  resultsList.innerHTML = "";


  resultsSummary.textContent =
    `${from} → ${to} • ${formatDate(date)} • ${buses.length} bus services found`;


  buses.forEach((bus, index) => {

    const card = document.createElement("article");

    card.className = "bus-card";


    card.innerHTML = `

      <div class="bus-operator">
        ${bus.operator}
      </div>

      <div class="bus-main">

        <div class="bus-info">

          <h3>${bus.name}</h3>

          <p class="bus-type">
            ${bus.type}
          </p>

          <p class="bus-price">
            ₹${bus.price}
            <span>per seat</span>
          </p>

        </div>


        <div class="bus-timing">

          <div>
            <strong>${bus.departure}</strong>
            <span>${from}</span>
          </div>

          <div class="duration">
            ${bus.duration}
          </div>

          <div>
            <strong>${bus.arrival}</strong>
            <span>${to}</span>
          </div>

        </div>


        <div class="bus-action">

          <span class="seat-count">
            ${bus.seats} seats
          </span>

          <button
            class="book-seat"
            type="button"
            data-index="${index}"
          >
            Book Seat
          </button>

        </div>

      </div>

    `;


    resultsList.appendChild(card);

  });


  /*
     Connect Book Seat buttons
  */

  document
    .querySelectorAll(".book-seat")
    .forEach(button => {

      button.addEventListener("click", () => {

        const bus =
          buses[Number(button.dataset.index)];

        openSeatSelection(bus);

      });

    });


  /*
     Scroll to results
  */

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateString) {

  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

}


/* =========================================================
   SEAT SELECTION MODAL
   ========================================================= */

function openSeatSelection(bus) {

  /*
     Remove previous modal
  */

  const oldModal =
    document.getElementById("seat-modal");

  if (oldModal) {
    oldModal.remove();
  }


  /*
     Randomly create some already-booked seats.
     This makes the demonstration look realistic.
  */

  const bookedSeats = generateBookedSeats(bus.seats);


  /*
     Create modal
  */

  const modal =
    document.createElement("div");

  modal.id = "seat-modal";

  modal.innerHTML = `

    <div class="seat-overlay">

      <div class="seat-modal-box">

        <button
          class="close-seat-modal"
          id="close-seat-modal"
          type="button"
          aria-label="Close"
        >
          ×
        </button>


        <div class="seat-modal-header">

          <p class="seat-modal-label">
            SELECT YOUR SEAT
          </p>

          <h2>
            ${bus.name}
          </h2>

          <p>
            ${bus.type} • ₹${bus.price} per seat
          </p>

        </div>


        <div class="seat-legend">

          <span>
            <i class="legend available"></i>
            Available
          </span>

          <span>
            <i class="legend selected"></i>
            Selected
          </span>

          <span>
            <i class="legend booked"></i>
            Booked
          </span>

        </div>


        <div class="bus-layout">

          <div class="driver">
            DRIVER
          </div>

          <div
            class="seat-grid"
            id="seat-grid"
          >
          </div>

        </div>


        <div class="booking-summary">

          <div>

            <span>Selected Seat</span>

            <strong id="selected-seat">
              None
            </strong>

          </div>


          <div>

            <span>Total Fare</span>

            <strong id="selected-fare">
              ₹0
            </strong>

          </div>

        </div>


        <button
          class="continue-booking"
          id="continue-booking"
          type="button"
          disabled
        >
          Continue
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(modal);


  /*
     Create seats
  */

  const seatGrid =
    document.getElementById("seat-grid");


  for (let seatNumber = 1; seatNumber <= bus.seats; seatNumber++) {

    const seat =
      document.createElement("button");

    seat.type = "button";

    seat.className = "seat";

    seat.textContent = seatNumber;

    seat.dataset.seat = seatNumber;


    /*
       Already booked
    */

    if (bookedSeats.includes(seatNumber)) {

      seat.classList.add("booked");

      seat.disabled = true;

    }


    seatGrid.appendChild(seat);

  }


  /*
     Seat selection
  */

  let selectedSeat = null;


  document
    .querySelectorAll(".seat:not(.booked)")
    .forEach(seat => {

      seat.addEventListener("click", () => {

        /*
           Remove previous selection
        */

        document
          .querySelectorAll(".seat.selected")
          .forEach(item => {

            item.classList.remove("selected");

          });


        /*
           Select current seat
        */

        seat.classList.add("selected");

        selectedSeat =
          seat.dataset.seat;


        document.getElementById("selected-seat")
          .textContent =
          `Seat ${selectedSeat}`;


        document.getElementById("selected-fare")
          .textContent =
          `₹${bus.price}`;


        document.getElementById("continue-booking")
          .disabled = false;

      });

    });


  /*
     Close modal
  */

  document
    .getElementById("close-seat-modal")
    .addEventListener("click", () => {

      modal.remove();

    });


  /*
     Click outside modal to close
  */

  document
    .querySelector(".seat-overlay")
    .addEventListener("click", event => {

      if (
        event.target.classList.contains(
          "seat-overlay"
        )
      ) {

        modal.remove();

      }

    });


  /*
     Continue booking
  */

  document
    .getElementById("continue-booking")
    .addEventListener("click", () => {

      if (!selectedSeat) {
        return;
      }


      alert(
        `Seat ${selectedSeat} selected for ${bus.name}.\n\n` +
        `Fare: ₹${bus.price}\n\n` +
        `Passenger details and payment will be added next.`
      );

    });

}


/* =========================================================
   GENERATE BOOKED SEATS
   ========================================================= */

function generateBookedSeats(totalSeats) {

  const booked = [];

  /*
     Number of already booked seats:
     approximately 10–25%
  */

  const numberOfBookedSeats =
    Math.max(
      3,
      Math.floor(totalSeats * 0.15)
    );


  while (booked.length < numberOfBookedSeats) {

    const randomSeat =
      Math.floor(
        Math.random() * totalSeats
      ) + 1;


    if (!booked.includes(randomSeat)) {

      booked.push(randomSeat);

    }

  }


  return booked;

}


/* =========================================================
   SEAT MODAL STYLES
   These styles are added automatically.
   No need to edit styles.css for this step.
   ========================================================= */

const seatStyles =
document.createElement("style");


seatStyles.textContent = `

/* -----------------------------------------
   MODAL OVERLAY
----------------------------------------- */

.seat-overlay {

  position: fixed;

  inset: 0;

  z-index: 9999;

  background: rgba(8, 24, 45, 0.72);

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20px;

  overflow-y: auto;

}


/* -----------------------------------------
   MODAL
----------------------------------------- */

.seat-modal-box {

  width: min(720px, 100%);

  max-height: 92vh;

  overflow-y: auto;

  background: #ffffff;

  border-radius: 24px;

  padding: 30px;

  position: relative;

  box-shadow:
    0 25px 70px rgba(0,0,0,0.25);

}


/* -----------------------------------------
   CLOSE
----------------------------------------- */

.close-seat-modal {

  position: absolute;

  right: 18px;

  top: 14px;

  width: 40px;

  height: 40px;

  border: none;

  border-radius: 50%;

  background: #f3f5f8;

  color: #18365d;

  font-size: 28px;

  cursor: pointer;

}


/* -----------------------------------------
   HEADER
----------------------------------------- */

.seat-modal-header {

  text-align: center;

  padding: 5px 40px 20px;

}


.seat-modal-label {

  font-size: 12px;

  font-weight: 800;

  letter-spacing: 2px;

  color: #b45b12;

  margin-bottom: 7px;

}


.seat-modal-header h2 {

  margin: 0;

  color: #12365f;

  font-size: 26px;

}


.seat-modal-header p:last-child {

  color: #6d7d91;

  margin-top: 8px;

}


/* -----------------------------------------
   LEGEND
----------------------------------------- */

.seat-legend {

  display: flex;

  justify-content: center;

  gap: 24px;

  flex-wrap: wrap;

  margin-bottom: 22px;

  color: #53667d;

  font-size: 13px;

}


.seat-legend span {

  display: flex;

  align-items: center;

  gap: 7px;

}


.legend {

  width: 16px;

  height: 16px;

  border-radius: 4px;

  display: inline-block;

  border: 1px solid #ccd5df;

}


.legend.available {

  background: white;

}


.legend.selected {

  background: #b45b12;

  border-color: #b45b12;

}


.legend.booked {

  background: #d9dee5;

}


/* -----------------------------------------
   BUS BODY
----------------------------------------- */

.bus-layout {

  width: min(390px, 100%);

  margin: auto;

  border: 2px solid #dce3eb;

  border-radius: 28px;

  padding: 20px 16px 25px;

  background: #f8fafc;

}


.driver {

  width: 85px;

  margin-left: auto;

  margin-bottom: 20px;

  padding: 8px;

  text-align: center;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 1px;

  color: #68788c;

  background: #e8edf3;

  border-radius: 8px;

}


/* -----------------------------------------
   SEAT GRID
----------------------------------------- */

.seat-grid {

  display: grid;

  grid-template-columns:
    repeat(4, minmax(42px, 1fr));

  gap: 10px;

}


/*
   Every row has:
   2 seats | aisle | 2 seats
*/

.seat {

  min-height: 42px;

  border: 1px solid #ccd5df;

  border-radius: 9px;

  background: #ffffff;

  color: #193b63;

  font-weight: 700;

  cursor: pointer;

  transition:
    transform 0.15s ease,
    background 0.15s ease;

}


.seat:nth-child(4n + 2) {

  margin-right: 18px;

}


.seat:hover:not(:disabled) {

  transform: translateY(-2px);

  border-color: #b45b12;

}


.seat.selected {

  background: #b45b12;

  color: white;

  border-color: #b45b12;

}


.seat.booked {

  background: #d9dee5;

  color: #8a96a5;

  cursor: not-allowed;

  text-decoration: line-through;

}


/* -----------------------------------------
   SUMMARY
----------------------------------------- */

.booking-summary {

  display: flex;

  justify-content: space-between;

  gap: 20px;

  margin-top: 22px;

  padding: 18px;

  border-radius: 14px;

  background: #f5f7fa;

}


.booking-summary div {

  display: flex;

  flex-direction: column;

  gap: 5px;

}


.booking-summary span {

  font-size: 12px;

  color: #708096;

}


.booking-summary strong {

  color: #12365f;

  font-size: 18px;

}


/* -----------------------------------------
   CONTINUE
----------------------------------------- */

.continue-booking {

  width: 100%;

  margin-top: 18px;

  border: none;

  border-radius: 12px;

  padding: 15px;

  background: #b45b12;

  color: white;

  font-size: 16px;

  font-weight: 800;

  cursor: pointer;

}


.continue-booking:disabled {

  background: #cbd2da;

  cursor: not-allowed;

}


/* -----------------------------------------
   MOBILE
----------------------------------------- */

@media (max-width: 600px) {

  .seat-overlay {

    padding: 10px;

    align-items: flex-start;

  }


  .seat-modal-box {

    margin-top: 15px;

    padding: 20px 14px;

    border-radius: 20px;

    max-height: 94vh;

  }


  .seat-modal-header {

    padding-left: 25px;

    padding-right: 25px;

  }


  .seat-modal-header h2 {

    font-size: 21px;

  }


  .seat-grid {

    gap: 7px;

  }


  .seat {

    min-height: 40px;

    font-size: 13px;

  }


  .seat:nth-child(4n + 2) {

    margin-right: 10px;

  }


  .booking-summary {

    padding: 14px;

  }

}


/* -----------------------------------------
   SMALL PHONES
----------------------------------------- */

@media (max-width: 380px) {

  .seat {

    min-height: 36px;

    font-size: 12px;

  }


  .seat-grid {

    gap: 5px;

  }

}

`;


document.head.appendChild(seatStyles);
