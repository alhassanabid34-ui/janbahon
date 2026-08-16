(() => {
  const BUS_IDS = {
    "Mankachar Express": "astc-mankachar-express",
    "South Assam Travels": "janbahon-south-assam",
    "Brahmaputra Superfast": "assam-roadways-brahmaputra",
    "Barak Valley Express": "janbahon-barak-valley",
    "Assam Night Rider": "northeast-night-rider"
  };

  const busPrices = {
    "astc-mankachar-express": 480,
    "janbahon-south-assam": 390,
    "assam-roadways-brahmaputra": 520,
    "janbahon-barak-valley": 360,
    "northeast-night-rider": 550
  };

  let lastSeatSyncKey = "";
  let syncingSeats = false;

  function getBusIdFromSeatModal() {
    const heading = document.querySelector("#seat-modal.open .booking-head h2");
    return heading ? BUS_IDS[heading.textContent.trim()] : null;
  }

  function getJourneyDate() {
    return document.getElementById("date")?.value || "";
  }

  function setSeatAvailability(bookedSeats, errorMessage = "") {
    const booked = new Set(bookedSeats);
    document.querySelectorAll("#seat-modal.open .seat").forEach(button => {
      const seat = Number(button.dataset.seat);
      button.classList.remove("booked", "api-loading");
      button.disabled = false;
      if (booked.has(seat)) {
        button.classList.add("booked");
        button.disabled = true;
        button.classList.remove("selected");
      }
    });

    let notice = document.getElementById("live-seat-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "live-seat-notice";
      notice.style.cssText = "margin:10px auto 0;max-width:410px;padding:10px 12px;border-radius:10px;text-align:center;font-size:12px;color:#536073;background:#f5f7fa";
      document.querySelector("#seat-modal.open .bus-layout")?.after(notice);
    }
    notice.textContent = errorMessage || "Live seat availability updated.";
    notice.style.color = errorMessage ? "#9b2c2c" : "#536073";
    notice.style.background = errorMessage ? "#fff0f0" : "#f5f7fa";
  }

  async function syncSeatAvailability(force = false) {
    const modal = document.getElementById("seat-modal");
    if (!modal?.classList.contains("open") || syncingSeats) return;

    const busId = getBusIdFromSeatModal();
    const date = getJourneyDate();
    const key = `${busId}|${date}`;
    if (!busId || !date || (!force && key === lastSeatSyncKey)) return;

    syncingSeats = true;
    document.querySelectorAll("#seat-modal.open .seat").forEach(button => {
      button.disabled = true;
      button.classList.add("api-loading");
    });

    try {
      const response = await fetch(`/api/bookings?busId=${encodeURIComponent(busId)}&date=${encodeURIComponent(date)}`, {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load seat availability.");
      setSeatAvailability(data.bookedSeats || []);
      lastSeatSyncKey = key;
    } catch (error) {
      setSeatAvailability([], "Live booking database is not ready yet. Please try again after setup.");
      console.error("Seat availability error", error);
    } finally {
      syncingSeats = false;
    }
  }

  function parseReviewPassengers() {
    return [...document.querySelectorAll("#review-modal .review-passenger")].map(row => {
      const strong = row.querySelector("strong")?.textContent.trim() || "";
      const match = strong.match(/^Seat\s+(\d+)\s+•\s+(.+)$/);
      const phone = row.querySelector("span")?.textContent.replace(/\D/g, "").slice(-10) || "";
      return match ? { seat: Number(match[1]), name: match[2].trim(), whatsapp: phone } : null;
    }).filter(Boolean);
  }

  function showPaymentError(message) {
    const box = document.querySelector("#payment-modal.open .booking-box");
    if (!box) return;
    let error = box.querySelector(".booking-api-error");
    if (!error) {
      error = document.createElement("div");
      error.className = "booking-api-error";
      error.style.cssText = "margin-top:12px;padding:12px;border-radius:10px;background:#fff0f0;color:#9b2c2c;font-size:13px;font-weight:700;text-align:center";
      box.querySelector("#pay-now")?.before(error);
    }
    error.textContent = message;
  }

  function showConfirmedBooking(result) {
    const modal = document.getElementById("payment-modal");
    const box = modal?.querySelector(".booking-box");
    if (!box) return;

    const currentBusName = Object.entries(BUS_IDS).find(([, id]) => id === result.busId)?.[0] || "Bus";
    const amount = Number(result.totalAmount || 0).toLocaleString("en-IN");

    box.innerHTML = `
      <div class="success-box"><div class="success-icon">✓</div><h2>Booking Confirmed</h2><p>Your reservation has been saved. Payment is still in demo mode.</p><span class="booking-id">${result.bookingId}</span></div>
      <div class="review-card" style="margin-top:15px"><div class="review-section">
        <div class="fare-row"><span>Bus</span><strong>${currentBusName}</strong></div>
        <div class="fare-row"><span>Journey date</span><strong>${document.getElementById("date")?.value || ""}</strong></div>
        <div class="fare-row"><span>Seats</span><strong>${result.seats.join(", ")}</strong></div>
        <div class="fare-row"><span>Amount</span><strong>₹${amount}</strong></div>
      </div></div>
      <button class="booking-primary" id="finish-booking" type="button">Done</button>`;

    box.querySelector("#finish-booking").addEventListener("click", () => {
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
      lastSeatSyncKey = "";
      window.location.hash = `booking-${result.bookingId}`;
    });
  }

  async function saveBooking(event) {
    if (!event.target?.matches?.("#pay-now")) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const button = event.target;
    if (button.dataset.saving === "1") return;
    button.dataset.saving = "1";
    button.disabled = true;
    button.textContent = "Saving booking...";

    const busSection = document.querySelector("#review-modal .review-section");
    const busText = busSection?.textContent || "";
    const busName = Object.keys(BUS_IDS).find(name => busText.includes(name)) || "";
    const busId = BUS_IDS[busName];
    const passengers = parseReviewPassengers();
    const journeyDate = getJourneyDate();

    if (!busId || !journeyDate || !passengers.length) {
      button.disabled = false;
      button.dataset.saving = "";
      button.textContent = "Pay & Confirm";
      showPaymentError("Booking information is incomplete. Please go back and review the details.");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          busId,
          journeyDate,
          passengers,
          paymentStatus: "demo"
        })
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "SEAT_CONFLICT") {
          showPaymentError("A selected seat was just booked by another customer. Please return to the seat map and choose another seat.");
          button.disabled = false;
          button.dataset.saving = "";
          button.textContent = `Pay ₹${(passengers.length * (busPrices[busId] || 0)).toLocaleString("en-IN")}`;
          return;
        }
        throw new Error(data.error || "Booking could not be saved.");
      }

      showConfirmedBooking(data);
    } catch (error) {
      console.error("Booking save error", error);
      showPaymentError(error.message || "Could not save your booking. Please try again.");
      button.disabled = false;
      button.dataset.saving = "";
      button.textContent = "Try Again";
    }
  }

  document.addEventListener("click", saveBooking, true);

  const observer = new MutationObserver(() => {
    const modal = document.getElementById("seat-modal");
    if (modal?.classList.contains("open")) syncSeatAvailability();
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });

  window.addEventListener("focus", () => {
    if (document.getElementById("seat-modal")?.classList.contains("open")) syncSeatAvailability(true);
  });
})();
