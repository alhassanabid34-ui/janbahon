const $ = id => document.getElementById(id);

const loginView = $("loginView");
const registerView = $("registerView");
const dashboardView = $("dashboardView");
const authMessage = $("authMessage");

let mobile = "";
let operatorName = "";


/* =========================
   HELPERS
========================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function showMessage(el, text, ok = false) {
  if (!el) return;

  el.textContent = text;
  el.style.color = ok ? "#16824b" : "#b02b2b";
}


async function api(url, options = {}) {

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  const data = await response
    .json()
    .catch(() => ({
      error: "Unexpected server response."
    }));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}


/* =========================
   INITIAL AUTH CHECK
========================= */

async function init() {

  try {

    const data = await api("/api/owner-auth");

    if (data.authenticated) {

      openDashboard(data.owner);

    } else if (data.pendingRegistration) {

      loginView.classList.add("hidden");

      registerView.classList.remove("hidden");
    }

  } catch (error) {

    showMessage(
      authMessage,
      error.message
    );
  }
}


/* =========================
   SEND OTP
========================= */

$("otpForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    mobile = $("mobile")
      .value
      .replace(/\D/g, "")
      .slice(0, 10);

    if (mobile.length !== 10) {

      showMessage(
        authMessage,
        "Enter a valid 10-digit mobile number."
      );

      return;
    }

    $("sendOtp").disabled = true;

    try {

      await api(
        "/api/owner-auth?action=send-otp",
        {
          method: "POST",

          headers: {
            "content-type": "application/json"
          },

          body: JSON.stringify({
            mobile
          })
        }
      );

      $("otpStep")
        .classList
        .remove("hidden");

      showMessage(
        authMessage,
        "OTP sent. It is valid for a limited time.",
        true
      );

      $("otp").focus();

    } catch (error) {

      showMessage(
        authMessage,
        error.message
      );

    } finally {

      $("sendOtp").disabled = false;
    }
  }
);


/* =========================
   VERIFY OTP
========================= */

$("verifyOtp").addEventListener(
  "click",
  async () => {

    const code = $("otp")
      .value
      .replace(/\D/g, "");

    if (code.length < 4) {

      showMessage(
        authMessage,
        "Enter the OTP you received."
      );

      return;
    }

    $("verifyOtp").disabled = true;

    try {

      const data = await api(
        "/api/owner-auth?action=verify-otp",
        {
          method: "POST",

          headers: {
            "content-type": "application/json"
          },

          body: JSON.stringify({
            mobile,
            code
          })
        }
      );

      if (data.registered) {

        openDashboard(data.owner);

      } else {

        loginView.classList.add("hidden");

        registerView.classList.remove("hidden");
      }

    } catch (error) {

      showMessage(
        authMessage,
        error.message
      );

    } finally {

      $("verifyOtp").disabled = false;
    }
  }
);


/* =========================
   OWNER REGISTRATION
========================= */

$("registerForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const form = event.currentTarget;

    const data = new FormData(form);

    if (!data.get("consent")) {

      showMessage(
        $("registerMessage"),
        "Please accept the verification declaration."
      );

      return;
    }

    try {

      const result = await api(
        "/api/owner-auth?action=register",
        {
          method: "POST",
          body: data
        }
      );

      showMessage(
        $("registerMessage"),
        "Registration submitted. Your KYC status is pending verification.",
        true
      );

      setTimeout(
        () => {

          openDashboard({

            full_name:
              data.get("fullName"),

            business_name:
              data.get("businessName"),

            status:
              result.status

          });

        },
        500
      );

    } catch (error) {

      showMessage(
        $("registerMessage"),
        error.message
      );
    }
  }
);


/* =========================
   PHOTO VALIDATION
========================= */

$("busPhotos").addEventListener(
  "change",
  event => {

    if (event.target.files.length > 5) {

      event.target.value = "";

      showMessage(
        $("busMessage"),
        "Select at most 5 photos."
      );
    }
  }
);


/* =========================
   ADD BUS
========================= */

$("busForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const form = event.currentTarget;

    const photos =
      $("busPhotos").files;

    if (photos.length > 5) {

      showMessage(
        $("busMessage"),
        "Maximum 5 bus photos allowed."
      );

      return;
    }


    for (const file of photos) {

      if (file.size > 8 * 1024 * 1024) {

        showMessage(
          $("busMessage"),
          "Each photo must be 8 MB or smaller."
        );

        return;
      }
    }


    const video =
      form.elements.video.files[0];

    if (
      video &&
      video.size > 25 * 1024 * 1024
    ) {

      showMessage(
        $("busMessage"),
        "Video must be 25 MB or smaller."
      );

      return;
    }


    const data =
      new FormData(form);

    data.set(
      "operator",
      operatorName
    );


    try {

      await api(
        "/api/owner-buses?action=create-bus",
        {
          method: "POST",
          body: data
        }
      );

      form.reset();

      $("busOperator").value =
        operatorName;

      showMessage(
        $("busMessage"),
        "Bus added successfully.",
        true
      );

      loadBuses();

    } catch (error) {

      showMessage(
        $("busMessage"),
        error.message
      );
    }
  }
);


/* =========================
   LOGOUT
========================= */

$("logout").addEventListener(
  "click",
  async () => {

    await api(
      "/api/owner-auth?action=logout",
      {
        method: "POST"
      }
    ).catch(() => {});

    location.reload();
  }
);


/* =========================
   OPEN DASHBOARD
========================= */

function openDashboard(owner) {

  loginView.classList.add("hidden");

  registerView.classList.add("hidden");

  dashboardView.classList.remove("hidden");


  operatorName =
    String(
      owner?.business_name ||
      "Your Operator"
    ).trim();


  $("ownerName").textContent =
    `Welcome, ${owner?.full_name || "Bus Owner"}`;


  $("ownerBusiness").textContent =
    `Operator: ${operatorName} • KYC: ${owner?.status || "pending"}`;


  $("operatorMobile").textContent =
    mobile
      ? `Owner mobile: ${mobile}`
      : "Owner account verified by mobile OTP";


  $("busOperator").value =
    operatorName;


  loadBuses();
}


/* =========================
   OPERATOR CHART
========================= */

function renderOperatorChart(buses) {

  const chart =
    $("operatorChart");

  if (!chart) return;


  /*
    Group buses by operator.

    Example:

    ASTC              1
    Assam Roadways   1
    JANBAHON         2
    Northeast Travels 1
  */

  const operatorMap =
    new Map();


  buses.forEach(bus => {

    const name =
      String(
        bus.operator ||
        "Unknown Operator"
      ).trim();


    if (!operatorMap.has(name)) {

      operatorMap.set(name, 0);
    }


    operatorMap.set(
      name,
      operatorMap.get(name) + 1
    );
  });


  /*
    If owner has no buses yet,
    still show owner's operator.
  */

  if (
    operatorMap.size === 0 &&
    operatorName
  ) {

    operatorMap.set(
      operatorName,
      0
    );
  }


  if (operatorMap.size === 0) {

    chart.innerHTML = `
      <div
        style="
          padding:16px;
          border:1px solid #e1e6ed;
          border-radius:14px;
          background:#f8fafc;
        "
      >
        <strong>No operators yet</strong>
      </div>
    `;

    return;
  }


  chart.innerHTML = "";


  operatorMap.forEach(
    (busCount, name) => {

      const card =
        document.createElement("div");


      card.style.cssText = `
        padding:18px;
        border:1px solid #e1e6ed;
        border-radius:14px;
        background:#ffffff;
        box-shadow:0 2px 8px rgba(0,0,0,.04);
      `;


      card.innerHTML = `

        <span
          style="
            display:block;
            font-size:12px;
            color:#6b7280;
            text-transform:uppercase;
            letter-spacing:.08em;
          "
        >
          BUS OPERATOR
        </span>

        <strong
          style="
            display:block;
            margin-top:7px;
            color:#082b5c;
            font-size:19px;
          "
        >
          ${escapeHTML(name)}
        </strong>

        <span
          style="
            display:block;
            margin-top:8px;
            color:#555;
            font-size:14px;
          "
        >
          ${busCount}
          ${busCount === 1 ? "bus" : "buses"}
        </span>
      `;


      chart.appendChild(card);
    }
  );
}


/* =========================
   LOAD BUSES
========================= */

async function loadBuses() {

  const list =
    $("busList");


  list.innerHTML =
    '<div class="empty">Loading your buses…</div>';


  try {

    const data =
      await api("/api/owner-buses");


    const buses =
      data.buses || [];


    /*
      IMPORTANT:

      First update the operator chart.
    */

    renderOperatorChart(buses);


    /*
      Total buses.
    */

    $("operatorBusCount")
      .textContent =
      String(buses.length);


    if (!buses.length) {

      list.innerHTML = `
        <div class="empty">

          <strong>
            No buses added yet.
          </strong>

          <br>

          Add your first bus above.

        </div>
      `;

      return;
    }


    list.innerHTML = "";


    buses.forEach(
      bus => {

        list.appendChild(
          renderBus(bus)
        );
      }
    );


  } catch (error) {

    list.innerHTML =
      `<div class="empty">
        ${escapeHTML(error.message)}
      </div>`;
  }
}


/* =========================
   RENDER BUS
========================= */

function renderBus(bus) {

  const card =
    document.createElement("article");


  card.className =
    "bus-card-owner";


  const photos =
    (bus.photo_keys || [])
      .map(
        key =>
          `
          <img
            src="/api/media?key=${encodeURIComponent(key)}"
            alt="${escapeHTML(bus.name)} bus photo"
            loading="lazy"
          >
          `
      )
      .join("");


  const video =
    bus.video_key
      ? `
        <a
          class="small"
          href="/api/media?key=${encodeURIComponent(bus.video_key)}"
          target="_blank"
          rel="noopener"
        >
          View bus video
        </a>
      `
      : "";


  const seats =
    Number(bus.total_seats || 0);


  const activeBlocks =
    (bus.blocks || [])
      .filter(
        block =>
          block.start_date <= today() &&
          (
            !block.end_date ||
            block.end_date >= today()
          )
      );


  const activeSet =
    new Set(
      activeBlocks.map(
        block =>
          Number(block.seat_number)
      )
    );


  card.innerHTML = `

    <div class="bus-card-top">

      <div>

        <h3>
          ${escapeHTML(bus.name)}
        </h3>

        <p class="bus-meta">

          ${escapeHTML(bus.operator)}

          •

          ${escapeHTML(bus.bus_type)}

          •

          ${escapeHTML(bus.from_city)}

          →

          ${escapeHTML(bus.to_city)}

          •

          ₹${Number(bus.price)
            .toLocaleString("en-IN")}

        </p>

      </div>


      <span class="hint">
        ${seats} seats
      </span>

    </div>


    <div class="media-row">

      ${
        photos ||
        '<span class="small">No photos uploaded.</span>'
      }

    </div>


    ${video}


    <div class="bus-tools">


      <!-- SEAT COUNT -->

      <div class="tool">

        <h4>
          Control total seats
        </h4>


        <div class="seat-count">

          <input
            id="count-${bus.bus_id}"
            type="number"
            min="4"
            max="100"
            value="${seats}"
          >


          <button
            class="secondary"
            data-update-seats="${escapeHTML(bus.bus_id)}"
          >
            Save
          </button>

        </div>

      </div>


      <!-- BLOCK SEATS -->

      <div class="tool">

        <h4>
          Block selected seats
        </h4>


        <div class="seat-buttons">

          ${Array.from(
            { length: seats },
            (_, i) => {

              const n = i + 1;

              return `

                <button
                  type="button"
                  class="${
                    activeSet.has(n)
                      ? "blocked"
                      : ""
                  }"
                  data-seat="${n}"
                  data-bus="${escapeHTML(bus.bus_id)}"
                >
                  ${n}
                </button>

              `;
            }
          ).join("")}

        </div>


        <div
          class="block-form"
          style="margin-top:12px"
        >

          <input
            id="date-${bus.bus_id}"
            type="date"
            value="${today()}"
            min="${today()}"
          >


          <select
            id="duration-${bus.bus_id}"
          >

            <option value="1_day">
              1 day
            </option>

            <option value="1_week">
              1 week
            </option>

            <option value="until_unblock">
              Until unblocked
            </option>

          </select>


          <button
            class="primary"
            data-block="${escapeHTML(bus.bus_id)}"
          >
            Block selected
          </button>

        </div>


        <div class="block-list">

          ${
            (bus.blocks || [])
              .map(
                block =>
                  `
                  <div class="block-item">

                    <span>
                      Seat ${block.seat_number}
                      •
                      ${block.start_date}
                      →
                      ${
                        block.end_date ||
                        "until unblocked"
                      }
                    </span>


                    <button
                      type="button"
                      data-unblock="${escapeHTML(block.block_id)}"
                    >
                      Unblock
                    </button>

                  </div>
                  `
              )
              .join("")
              ||
              '<span class="small">No seat blocks.</span>'
          }

        </div>

      </div>

    </div>
  `;


  /*
    Seat selection
  */

  card
    .querySelectorAll("[data-seat]")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            button.classList.toggle(
              "selected"
            );
          }
        );
      }
    );


  /*
    Block selected seats
  */

  card
    .querySelector("[data-block]")
    .addEventListener(
      "click",
      () =>
        blockSelected(
          card,
          bus.bus_id
        )
    );


  /*
    Update seat count
  */

  card
    .querySelector("[data-update-seats]")
    .addEventListener(
      "click",
      () => {

        const input =
          card.querySelector(
            `#count-${CSS.escape(bus.bus_id)}`
          );


        updateSeats(
          bus.bus_id,
          Number(input.value)
        );
      }
    );


  /*
    Unblock
  */

  card
    .querySelectorAll("[data-unblock]")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            unblock(
              button.dataset.unblock
            )
        );
      }
    );


  return card;
}


/* =========================
   BLOCK SELECTED SEATS
========================= */

async function blockSelected(
  card,
  busId
) {

  const selected =
    [
      ...card.querySelectorAll(
        "[data-seat].selected"
      )
    ].map(
      button =>
        Number(button.dataset.seat)
    );


  if (!selected.length) {

    alert(
      "Select one or more seats first."
    );

    return;
  }


  const startDate =
    card.querySelector(
      `#date-${CSS.escape(busId)}`
    ).value;


  const duration =
    card.querySelector(
      `#duration-${CSS.escape(busId)}`
    ).value;


  try {

    for (const seatNumber of selected) {

      await api(
        "/api/owner-buses?action=block-seat",
        {
          method: "POST",

          headers: {
            "content-type": "application/json"
          },

          body: JSON.stringify({

            busId,

            seatNumber,

            startDate,

            duration

          })
        }
      );
    }


    loadBuses();


  } catch (error) {

    alert(error.message);
  }
}


/* =========================
   UPDATE TOTAL SEATS
========================= */

async function updateSeats(
  busId,
  totalSeats
) {

  if (
    !Number.isInteger(totalSeats) ||
    totalSeats < 4 ||
    totalSeats > 100
  ) {

    alert(
      "Total seats must be between 4 and 100."
    );

    return;
  }


  try {

    await api(
      "/api/owner-buses?action=update-seats",
      {
        method: "POST",

        headers: {
          "content-type": "application/json"
        },

        body: JSON.stringify({
          busId,
          totalSeats
        })
      }
    );


    loadBuses();


  } catch (error) {

    alert(error.message);
  }
}


/* =========================
   UNBLOCK SEAT
========================= */

async function unblock(blockId) {

  try {

    await api(
      "/api/owner-buses?action=unblock-seat",
      {
        method: "POST",

        headers: {
          "content-type": "application/json"
        },

        body: JSON.stringify({
          blockId
        })
      }
    );


    loadBuses();


  } catch (error) {

    alert(error.message);
  }
}


/* =========================
   START
========================= */

init();
