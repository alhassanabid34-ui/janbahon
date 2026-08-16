(() => {
  const dateInput = document.getElementById("date");
  const searchForm = document.getElementById("searchForm");
  const fromInput = document.getElementById("from");
  const toInput = document.getElementById("to");
  const resultsSection = document.getElementById("bus-results");
  const resultsList = document.getElementById("bus-results-list");
  const resultsSummary = document.getElementById("results-summary");
  let liveState = { bus: null, date: "", seats: [], passengers: [] };

  const escapeHTML = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "";
  const close = () => { document.querySelectorAll(".live-modal").forEach(m=>m.classList.remove("open")); document.body.classList.remove("modal-open"); };
  const modal = id => {
    let m=document.getElementById(id);
    if(!m){m=document.createElement("div");m.id=id;m.className="booking-modal live-modal";m.innerHTML='<div class="booking-overlay"><div class="booking-box"></div></div>';document.body.appendChild(m);}
    return m;
  };
  const style = document.createElement("style");
  style.textContent = `.live-media{display:flex;gap:7px;margin:10px 0;overflow:auto}.live-media img{width:86px;height:60px;object-fit:cover;border-radius:8px}.live-badge{display:inline-block;padding:4px 8px;border-radius:99px;background:#e9f6ee;color:#16824b;font-size:11px;font-weight:800}.live-modal .booking-primary{cursor:pointer}`;
  document.head.appendChild(style);

  async function searchBuses(){
    const from=fromInput.value,to=toInput.value,date=dateInput.value;
    if(!from||!to||!date)return;
    if(from===to){alert("Origin and destination cannot be the same.");return;}
    resultsSummary.textContent=`${from} → ${to} • ${formatDate(date)} • Loading…`;
    resultsList.innerHTML='<div class="empty-results"><h3>Loading buses…</h3><p>Checking live seat availability.</p></div>';
    try{
      const r=await fetch(`/api/buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`,{cache:"no-store"});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||"Could not load buses.");
      renderResults(data.buses||[],from,to,date);
    }catch(error){
      resultsSummary.textContent=`${from} → ${to} • ${formatDate(date)}`;
      resultsList.innerHTML=`<div class="empty-results"><h3>Could not load buses</h3><p>${escapeHTML(error.message)}</p></div>`;
    }
    resultsSection?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function renderResults(matches,from,to,date){
    resultsList.innerHTML="";
    if(!matches.length){resultsSummary.textContent=`${from} → ${to} • ${formatDate(date)} • No buses found`;resultsList.innerHTML='<div class="empty-results"><h3>No buses found for this route</h3><p>Try another route or another journey date.</p></div>';return;}
    resultsSummary.textContent=`${from} → ${to} • ${formatDate(date)} • ${matches.length} buses found`;
    matches.forEach(bus=>{
      const card=document.createElement("article");card.className="bus-card";
      const photos=(bus.photos||[]).slice(0,5).map(src=>`<img src="${src}" alt="${escapeHTML(bus.name)}" loading="lazy">`).join("");
      card.innerHTML=`<div class="bus-operator-block"><div class="bus-operator">${escapeHTML(bus.operator)}</div></div><div class="bus-info"><h3>${escapeHTML(bus.name)}</h3><p class="bus-type">${escapeHTML(bus.type)} ${bus.ownerBus?'<span class="live-badge">Owner listed</span>':''}</p><p class="bus-price">₹${Number(bus.price).toLocaleString("en-IN")} <span>per seat</span></p>${photos?`<div class="live-media">${photos}</div>`:""}</div><div class="bus-journey-line"><div class="journey-point"><strong>${escapeHTML(bus.from)}</strong><span>${escapeHTML(bus.departure)}</span></div><div class="journey-track" aria-hidden="true"><span class="track-dot"></span><span class="track-line"></span><span class="bus-icon">▣</span><span class="track-line"></span><span class="track-dot"></span><small>${escapeHTML(bus.duration)}</small></div><div class="journey-point journey-arrival"><strong>${escapeHTML(bus.to)}</strong><span>${escapeHTML(bus.arrival)}</span></div></div><div class="bus-action"><span class="bus-seats">${bus.seats} seats available</span><button class="book-seat" type="button" ${bus.seats<1?"disabled":""}>${bus.seats<1?"Sold out":"Book Seat"}</button></div>`;
      card.querySelector(".book-seat")?.addEventListener("click",()=>openSeatModal(bus,date));resultsList.appendChild(card);
    });
    const note=document.createElement("p");note.className="bus-results-note";note.textContent="Live availability includes customer bookings and seats blocked by the bus owner.";resultsList.appendChild(note);
  }

  function openSeatModal(bus,date){
    liveState={bus,date,seats:[],passengers:[]};
    const m=modal("live-seat-modal"),box=m.querySelector(".booking-box");
    box.innerHTML='<button class="booking-close" type="button">×</button><div class="booking-head"><p class="booking-step">SELECT YOUR SEAT</p><h2>'+escapeHTML(bus.name)+'</h2><p>'+escapeHTML(bus.type)+' • ₹'+Number(bus.price).toLocaleString("en-IN")+' per seat</p></div><div class="seat-legend"><span><i class="legend"></i> Available</span><span><i class="legend selected"></i> Selected</span><span><i class="legend booked"></i> Unavailable</span></div><div class="bus-layout"><div class="driver">DRIVER</div><div id="live-seat-grid" class="seat-grid"><p>Loading live seats…</p></div></div><div class="booking-summary"><div><span>Selected Seats</span><strong id="live-seat-summary">None</strong></div><div><span>Total Fare</span><strong id="live-seat-total">₹0</strong></div></div><button class="booking-primary" id="live-seat-next" type="button" disabled>Continue</button>';
    m.classList.add("open");document.body.classList.add("modal-open");box.querySelector(".booking-close").onclick=close;
    fetch(`/api/bookings?busId=${encodeURIComponent(bus.id)}&date=${encodeURIComponent(date)}`,{cache:"no-store"}).then(r=>r.json().then(d=>({ok:r.ok,d}))).then(({ok,d})=>{
      if(!ok)throw new Error(d.error||"Could not load seats.");
      const unavailable=new Set([...(d.bookedSeats||[]),...(d.blockedSeats||[])]);const grid=box.querySelector("#live-seat-grid");
      grid.innerHTML=Array.from({length:Number(d.totalSeats||bus.totalSeats||bus.seats)},(_,i)=>i+1).map(n=>`<button type="button" class="seat ${unavailable.has(n)?"booked":""}" data-seat="${n}" ${unavailable.has(n)?"disabled":""}>${n}</button>`).join("");
      grid.querySelectorAll(".seat:not(.booked)").forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.seat);if(liveState.seats.includes(n)){liveState.seats=liveState.seats.filter(s=>s!==n);btn.classList.remove("selected")}else{liveState.seats.push(n);liveState.seats.sort((a,b)=>a-b);btn.classList.add("selected")}box.querySelector("#live-seat-summary").textContent=liveState.seats.join(", ")||"None";box.querySelector("#live-seat-total").textContent=`₹${(liveState.seats.length*bus.price).toLocaleString("en-IN")}`;box.querySelector("#live-seat-next").disabled=!liveState.seats.length;});
    }).catch(error=>{box.querySelector("#live-seat-grid").innerHTML=`<p style="color:#b02b2b">${escapeHTML(error.message)}</p>`});
    box.querySelector("#live-seat-next").onclick=()=>{close();openPassengerModal()};
  }

  function openPassengerModal(){
    const m=modal("live-passenger-modal"),box=m.querySelector(".booking-box"),bus=liveState.bus;
    box.innerHTML=`<button class="booking-close" type="button">×</button><div class="booking-head"><p class="booking-step">PASSENGER DETAILS</p><h2>Who is travelling?</h2><p>Enter details for each selected seat.</p></div><div class="passenger-list">${liveState.seats.map((seat,i)=>`<div class="passenger-card" data-i="${i}"><div class="passenger-card-header"><strong>Passenger ${i+1}</strong><span>Seat ${seat}</span></div><div class="passenger-fields"><div class="passenger-field"><label>FULL NAME</label><input class="p-name" placeholder="Full name"></div><div class="passenger-field"><label>WHATSAPP NUMBER</label><input class="p-phone" inputmode="numeric" maxlength="10" placeholder="10-digit number"></div></div>${i>0?'<label class="same-number"><input class="same-check" type="checkbox"> Use same WhatsApp number as Passenger 1</label>':''}</div>`).join("")}</div><button class="booking-primary" id="live-passenger-next" type="button">Review Booking</button>`;
    m.classList.add("open");document.body.classList.add("modal-open");box.querySelector(".booking-close").onclick=()=>{close();openSeatModal(bus,liveState.date)};
    const sync=()=>{const cards=[...box.querySelectorAll(".passenger-card")];liveState.passengers=cards.map((card,i)=>({seat:liveState.seats[i],name:card.querySelector(".p-name").value.trim(),whatsapp:card.querySelector(".p-phone").value.replace(/\D/g,"").slice(0,10)}));cards.forEach((card,i)=>{const check=card.querySelector(".same-check"),phone=card.querySelector(".p-phone");if(check&&check.checked&&liveState.passengers[0]){phone.value=liveState.passengers[0].whatsapp;phone.disabled=true;liveState.passengers[i].whatsapp=liveState.passengers[0].whatsapp}else if(phone)phone.disabled=false})};
    box.querySelectorAll("input").forEach(i=>i.oninput=sync);box.querySelectorAll(".same-check").forEach(i=>i.onchange=sync);box.querySelector("#live-passenger-next").onclick=()=>{sync();if(liveState.passengers.some(p=>p.name.length<2||!/^\d{10}$/.test(p.whatsapp))){alert("Please enter a valid name and 10-digit WhatsApp number for every passenger.");return}close();openReviewModal()};
  }

  function openReviewModal(){
    const m=modal("live-review-modal"),box=m.querySelector(".booking-box"),bus=liveState.bus,total=liveState.seats.length*bus.price;
    box.innerHTML=`<button class="booking-close" type="button">×</button><div class="booking-head"><p class="booking-step">BOOKING REVIEW</p><h2>Review your journey</h2><p>${escapeHTML(formatDate(liveState.date))}</p></div><div class="review-card"><div class="review-section"><h3>Journey</h3><div class="review-route"><div class="review-place"><strong>${escapeHTML(bus.from)}</strong><span>${escapeHTML(bus.departure)}</span></div><div class="review-arrow">→</div><div class="review-place"><strong>${escapeHTML(bus.to)}</strong><span>${escapeHTML(bus.arrival)}</span></div></div><p style="color:#6d7788;margin:12px 0 0">${escapeHTML(bus.duration)} • ${escapeHTML(bus.name)}</p></div><div class="review-section"><h3>Passengers</h3>${liveState.passengers.map(p=>`<div class="review-passenger"><strong>Seat ${p.seat} • ${escapeHTML(p.name)}</strong><span>+91 ${p.whatsapp}</span></div>`).join("")}</div><div class="review-section"><h3>Fare Summary</h3><div class="fare-row"><span>${liveState.seats.length} seat(s)</span><strong>₹${total.toLocaleString("en-IN")}</strong></div><div class="fare-total"><span>Total</span><span>₹${total.toLocaleString("en-IN")}</span></div></div></div><button class="booking-primary" id="live-pay" type="button">Proceed to Payment • ₹${total.toLocaleString("en-IN")}</button>`;
    m.classList.add("open");document.body.classList.add("modal-open");box.querySelector(".booking-close").onclick=()=>{close();openPassengerModal()};box.querySelector("#live-pay").onclick=()=>{close();openPaymentModal()};
  }

  function openPaymentModal(){
    const m=modal("live-payment-modal"),box=m.querySelector(".booking-box"),total=liveState.seats.length*liveState.bus.price;
    box.innerHTML=`<button class="booking-close" type="button">×</button><div class="booking-head"><p class="booking-step">SECURE PAYMENT</p><h2>Complete your payment</h2><p>Total payable: <strong>₹${total.toLocaleString("en-IN")}</strong></p></div><div class="payment-methods"><button class="payment-method active" type="button">UPI</button><button class="payment-method" type="button">Card</button><button class="payment-method" type="button">Net Banking</button></div><div class="payment-panel"><label>UPI ID</label><input placeholder="example@upi"></div><p class="secure-note">Demo payment screen. No real money will be charged at this stage.</p><button class="booking-primary" id="live-confirm" type="button">Pay & Confirm</button>`;
    m.classList.add("open");document.body.classList.add("modal-open");box.querySelector(".booking-close").onclick=close;box.querySelector("#live-confirm").onclick=saveBooking;
  }

  async function saveBooking(){
    const button=document.querySelector("#live-payment-modal.open #live-confirm");if(!button)return;button.disabled=true;button.textContent="Saving booking…";
    try{const r=await fetch("/api/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({busId:liveState.bus.id,journeyDate:liveState.date,passengers:liveState.passengers,paymentStatus:"demo"})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Booking failed.");showSuccess(data)}catch(error){button.disabled=false;button.textContent="Try Again";alert(error.message)}
  }

  function showSuccess(result){const m=document.getElementById("live-payment-modal"),box=m.querySelector(".booking-box");box.innerHTML=`<div class="success-box"><div class="success-icon">✓</div><h2>Booking Confirmed</h2><p>Your reservation has been saved.</p><span class="booking-id">${escapeHTML(result.bookingId)}</span></div><div class="review-card" style="margin-top:15px"><div class="review-section"><div class="fare-row"><span>Bus</span><strong>${escapeHTML(liveState.bus.name)}</strong></div><div class="fare-row"><span>Journey date</span><strong>${escapeHTML(liveState.date)}</strong></div><div class="fare-row"><span>Seats</span><strong>${liveState.seats.join(", ")}</strong></div><div class="fare-row"><span>Amount</span><strong>₹${Number(result.totalAmount).toLocaleString("en-IN")}</strong></div></div></div><button class="booking-primary" id="live-done" type="button">Done</button>`;box.querySelector("#live-done").onclick=()=>{close();searchBuses()};
  }

  window.searchBuses=searchBuses;
  if(searchForm){searchForm.addEventListener("submit",e=>{e.preventDefault();searchBuses()});}
  document.querySelectorAll(".route-card").forEach(card=>card.addEventListener("click",()=>{fromInput.value=card.dataset.from||"";toInput.value=card.dataset.to||"";if(!dateInput.value)dateInput.value=dateInput.min;searchBuses()}));
})();
