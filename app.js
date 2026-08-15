const dateInput = document.getElementById("date");

const today = new Date();
const isoToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
)
  .toISOString()
  .slice(0, 10);

dateInput.min = isoToday;


// Swap origin and destination
document.getElementById("swap").addEventListener("click", () => {
  const from = document.getElementById("from");
  const to = document.getElementById("to");

  [from.value, to.value] = [to.value, from.value];
});


// Popular route buttons
document.querySelectorAll(".route-card").forEach(card => {
  card.addEventListener("click", () => {
    document.getElementById("from").value = card.dataset.from;
    document.getElementById("to").value = card.dataset.to;

    document
      .getElementById("booking")
      .scrollIntoView({ behavior: "smooth" });

    document.getElementById("date").focus();
  });
});


// Demo bus database
const buses = [
  {
    operator: "ASTC",
    from: "Dhubri",
    to: "Guwahati",
    departure: "06:30 AM",
    arrival: "12:00 PM",
    duration: "5h 30m",
    price: 420,
    type: "AC Seater"
  },
  {
    operator: "ASTC",
    from: "Dhubri",
    to: "Guwahati",
    departure: "08:00 AM",
    arrival: "01:30 PM",
    duration: "5h 30m",
    price: 380,
    type: "Non-AC Seater"
  },
  {
    operator: "Private Express",
    from: "Dhubri",
    to: "Guwahati",
    departure: "10:30 AM",
    arrival: "04:00 PM",
    duration: "5h 30m",
    price: 500,
    type: "AC Seater"
  },
  {
    operator: "ASTC",
    from: "Guwahati",
    to: "Dhubri",
    departure: "07:00 AM",
    arrival: "12:30 PM",
    duration: "5h 30m",
    price: 420,
    type: "AC Seater"
  },
  {
    operator: "ASTC",
    from: "Guwahati",
    to: "Dhubri",
    departure: "02:00 PM",
    arrival: "07:30 PM",
    duration: "5h 30m",
    price: 380,
    type: "Non-AC Seater"
  },
  {
    operator: "Private Express",
    from: "Guwahati",
    to: "Dhubri",
    departure: "05:00 PM",
    arrival: "10:30 PM",
    duration: "5h 30m",
    price: 500,
    type: "AC Seater"
  }
];


// Search buses
document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const date = document.getElementById("date").value;

  const resultsSummary = document.getElementById("results-summary");
  const resultsList = document.getElementById("bus-results-list");

  if (!from || !to || !date) {
    alert("Please select origin, destination and journey date.");
    return;
  }

  if (from === to) {
    alert("Origin and destination cannot be the same.");
    return;
  }

  const matchingBuses = buses.filter(
    bus => bus.from === from && bus.to === to
  );

  resultsList.innerHTML = "";

  if (matchingBuses.length === 0) {
    resultsSummary.textContent =
      `No buses found from ${from} to ${to} for ${date}.`;

    resultsList.innerHTML = `
      <div class="empty-results">
        <h3>No buses available</h3>
        <p>We could not find a bus for this route yet.</p>
      </div>
    `;

    document
      .getElementById("bus-results")
      .scrollIntoView({ behavior: "smooth" });

    return;
  }

  resultsSummary.textContent =
    `${matchingBuses.length} buses found from ${from} to ${to} on ${date}.`;

  matchingBuses.forEach(bus => {
    const card = document.createElement("div");

    card.className = "bus-card";

    card.innerHTML = `
      <div class="bus-info">
        <h3>${bus.operator}</h3>
        <p>${bus.type}</p>
      </div>

      <div class="bus-time">
        <strong>${bus.departure}</strong>
        <span>${bus.duration}</span>
        <strong>${bus.arrival}</strong>
      </div>

      <div class="bus-price">
        <strong>₹${bus.price}</strong>
        <span>per seat</span>
      </div>

      <button class="book-btn">
        Select Seat
      </button>
    `;

    card.querySelector(".book-btn").addEventListener("click", () => {
      alert(
        `${bus.operator} selected.\n${bus.from} → ${bus.to}\nFare: ₹${bus.price}`
      );
    });

    resultsList.appendChild(card);
  });

  document
    .getElementById("bus-results")
    .scrollIntoView({ behavior: "smooth" });
});
