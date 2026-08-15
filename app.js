const seatStyles = document.createElement("style");

seatStyles.textContent = `

/* =========================================
   JANBAHON SEAT SELECTION
   ========================================= */

#seat-modal {
  position: fixed !important;
  inset: 0 !important;
  z-index: 99999 !important;
}


/* OVERLAY */

#seat-modal .seat-overlay {
  position: fixed !important;
  inset: 0 !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  padding: 20px !important;

  background: rgba(12, 31, 55, 0.72) !important;

  overflow-y: auto !important;
}


/* MODAL */

#seat-modal .seat-modal-box {
  position: relative !important;

  width: min(720px, 100%) !important;
  max-height: 92vh !important;

  overflow-y: auto !important;

  background: #ffffff !important;

  border-radius: 24px !important;

  padding: 30px !important;

  box-shadow:
    0 25px 70px rgba(0, 0, 0, 0.28) !important;

  box-sizing: border-box !important;
}


/* CLOSE BUTTON */

#seat-modal .close-seat-modal {
  position: absolute !important;

  right: 18px !important;
  top: 14px !important;

  width: 42px !important;
  height: 42px !important;

  border: none !important;
  border-radius: 50% !important;

  background: #f1f4f7 !important;

  color: #173b63 !important;

  font-size: 27px !important;

  cursor: pointer !important;
}


/* HEADER */

#seat-modal .seat-modal-header {
  text-align: center !important;

  padding: 5px 45px 20px !important;
}


#seat-modal .seat-modal-label {
  margin: 0 0 8px !important;

  color: #b45b12 !important;

  font-size: 12px !important;

  font-weight: 800 !important;

  letter-spacing: 2px !important;
}


#seat-modal .seat-modal-header h2 {
  margin: 0 !important;

  color: #12365f !important;

  font-size: 28px !important;
}


#seat-modal .seat-modal-header p:last-child {
  margin: 8px 0 0 !important;

  color: #71839a !important;

  font-size: 16px !important;
}


/* LEGEND */

#seat-modal .seat-legend {
  display: flex !important;

  justify-content: center !important;

  align-items: center !important;

  gap: 25px !important;

  flex-wrap: wrap !important;

  margin-bottom: 22px !important;

  color: #53667d !important;

  font-size: 13px !important;
}


#seat-modal .seat-legend span {
  display: flex !important;

  align-items: center !important;

  gap: 7px !important;
}


#seat-modal .legend {
  display: inline-block !important;

  width: 16px !important;
  height: 16px !important;

  border-radius: 4px !important;

  border: 1px solid #ccd5df !important;
}


#seat-modal .legend.available {
  background: #ffffff !important;
}


#seat-modal .legend.selected {
  background: #b45b12 !important;

  border-color: #b45b12 !important;
}


#seat-modal .legend.booked {
  background: #d7dde5 !important;

  border-color: #d7dde5 !important;
}


/* =========================================
   BUS BODY
   ========================================= */

#seat-modal .bus-layout {
  width: min(410px, 100%) !important;

  margin: 0 auto !important;

  padding: 18px 18px 25px !important;

  box-sizing: border-box !important;

  border: 2px solid #dce4ed !important;

  border-radius: 28px !important;

  background: #f8fafc !important;
}


/* DRIVER */

#seat-modal .driver {
  width: 90px !important;

  margin-left: auto !important;

  margin-bottom: 20px !important;

  padding: 9px !important;

  box-sizing: border-box !important;

  text-align: center !important;

  background: #e7edf4 !important;

  border-radius: 9px !important;

  color: #66788d !important;

  font-size: 10px !important;

  font-weight: 800 !important;

  letter-spacing: 1px !important;
}


/* =========================================
   IMPORTANT:
   SEAT GRID
   ========================================= */

#seat-modal .seat-grid {

  display: grid !important;

  grid-template-columns:
    repeat(4, minmax(48px, 1fr)) !important;

  gap: 10px !important;

  width: 100% !important;

  min-height: 100px !important;

  box-sizing: border-box !important;
}


/* =========================================
   SEATS
   ========================================= */

#seat-modal .seat {

  display: flex !important;

  align-items: center !important;

  justify-content: center !important;

  width: 100% !important;

  min-width: 0 !important;

  height: 46px !important;

  padding: 0 !important;

  margin: 0 !important;

  box-sizing: border-box !important;

  border: 2px solid #d2dbe5 !important;

  border-radius: 9px !important;

  background: #ffffff !important;

  color: #173b63 !important;

  font-size: 14px !important;

  font-weight: 800 !important;

  line-height: 1 !important;

  cursor: pointer !important;

  opacity: 1 !important;

  visibility: visible !important;
}


/* Create aisle */

#seat-modal .seat:nth-child(4n + 2) {
  margin-right: 22px !important;
}


/* HOVER */

#seat-modal .seat:hover:not(:disabled) {

  transform: translateY(-2px) !important;

  border-color: #b45b12 !important;

  background: #fff8f1 !important;
}


/* SELECTED */

#seat-modal .seat.selected {

  background: #b45b12 !important;

  border-color: #b45b12 !important;

  color: #ffffff !important;
}


/* BOOKED */

#seat-modal .seat.booked {

  background: #d8dee6 !important;

  border-color: #d8dee6 !important;

  color: #8793a1 !important;

  cursor: not-allowed !important;

  text-decoration: line-through !important;

  opacity: 1 !important;
}


/* =========================================
   BOOKING SUMMARY
   ========================================= */

#seat-modal .booking-summary {

  display: flex !important;

  justify-content: space-between !important;

  align-items: center !important;

  gap: 20px !important;

  margin-top: 22px !important;

  padding: 18px !important;

  box-sizing: border-box !important;

  border-radius: 14px !important;

  background: #f4f7fa !important;
}


#seat-modal .booking-summary div {

  display: flex !important;

  flex-direction: column !important;

  gap: 5px !important;
}


#seat-modal .booking-summary span {

  color: #71839a !important;

  font-size: 12px !important;
}


#seat-modal .booking-summary strong {

  color: #12365f !important;

  font-size: 18px !important;
}


/* =========================================
   CONTINUE BUTTON
   ========================================= */

#seat-modal .continue-booking {

  display: block !important;

  width: 100% !important;

  margin-top: 18px !important;

  padding: 15px !important;

  border: none !important;

  border-radius: 12px !important;

  background: #b45b12 !important;

  color: #ffffff !important;

  font-size: 16px !important;

  font-weight: 800 !important;

  cursor: pointer !important;
}


#seat-modal .continue-booking:disabled {

  background: #cbd3dc !important;

  color: #ffffff !important;

  cursor: not-allowed !important;
}


/* =========================================
   TABLET
   ========================================= */

@media (max-width: 768px) {

  #seat-modal .seat-modal-box {
    width: min(680px, 95vw) !important;
  }

  #seat-modal .seat-grid {
    grid-template-columns:
      repeat(4, minmax(45px, 1fr)) !important;
  }

}


/* =========================================
   MOBILE
   ========================================= */

@media (max-width: 600px) {

  #seat-modal .seat-overlay {
    padding: 10px !important;

    align-items: flex-start !important;
  }


  #seat-modal .seat-modal-box {

    width: 100% !important;

    margin-top: 10px !important;

    padding: 20px 14px !important;

    border-radius: 20px !important;

    max-height: 95vh !important;
  }


  #seat-modal .seat-modal-header {

    padding-left: 30px !important;

    padding-right: 30px !important;
  }


  #seat-modal .seat-modal-header h2 {

    font-size: 21px !important;
  }


  #seat-modal .seat-grid {

    grid-template-columns:
      repeat(4, minmax(42px, 1fr)) !important;

    gap: 7px !important;
  }


  #seat-modal .seat {

    height: 42px !important;

    font-size: 13px !important;
  }


  #seat-modal .seat:nth-child(4n + 2) {

    margin-right: 10px !important;
  }


  #seat-modal .booking-summary {

    padding: 14px !important;
  }

}


/* =========================================
   SMALL PHONE
   ========================================= */

@media (max-width: 380px) {

  #seat-modal .seat-grid {

    gap: 5px !important;
  }


  #seat-modal .seat {

    height: 38px !important;

    font-size: 12px !important;
  }

}

`;

document.head.appendChild(seatStyles);
