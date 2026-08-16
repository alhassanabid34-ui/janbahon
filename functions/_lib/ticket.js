import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const NAVY = rgb(0.03, 0.13, 0.28);
const GOLD = rgb(0.78, 0.55, 0.12);
const LIGHT = rgb(0.96, 0.97, 0.98);
const GREY = rgb(0.38, 0.43, 0.50);
const GREEN = rgb(0.08, 0.51, 0.29);

function money(value) { return `Rs ${Number(value || 0).toLocaleString("en-IN")}`; }
function safe(value) { return String(value ?? "").replace(/[\r\n]/g, " ").slice(0, 120); }
function prettyDate(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", weekday: "long", timeZone: "UTC" });
}

export async function buildTicketPdf(ticket) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: height - 125, width, height: 125, color: NAVY });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: GOLD });
  page.drawText("JANBAHON", { x: 42, y: height - 58, size: 31, font: bold, color: rgb(1, 1, 1) });
  page.drawText("THAT INSPIRES ASSAM", { x: 44, y: height - 80, size: 10, font: bold, color: GOLD, characterSpacing: 2 });
  page.drawText("E-TICKET", { x: width - 125, y: height - 53, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText(safe(ticket.bookingId), { x: width - 175, y: height - 76, size: 9, font: regular, color: rgb(0.86, 0.90, 0.96) });

  let y = height - 160;
  page.drawText("BOOKING CONFIRMED", { x: 42, y, size: 20, font: bold, color: GREEN });
  y -= 28;
  page.drawText("Your reservation has been successfully confirmed.", { x: 42, y, size: 10, font: regular, color: GREY });

  y -= 38;
  page.drawRectangle({ x: 35, y: y - 175, width: width - 70, height: 190, color: LIGHT, borderColor: rgb(0.86, 0.88, 0.91), borderWidth: 1 });
  page.drawText("PASSENGER DETAILS", { x: 50, y, size: 11, font: bold, color: GOLD });
  y -= 25;
  const names = (ticket.passengers || []).map(p => safe(p.name)).join(", ");
  page.drawText(names || "Passenger", { x: 50, y, size: 17, font: bold, color: NAVY, maxWidth: width - 100 });
  y -= 34;
  const rows = [
    ["Journey date", prettyDate(ticket.journeyDate)],
    ["Seat(s)", (ticket.passengers || []).map(p => p.seat).join(", ")],
    ["Route", `${safe(ticket.fromCity)}  ->  ${safe(ticket.toCity)}`],
    ["Operator", safe(ticket.operator)],
    ["Owner", safe(ticket.ownerName || "JANBAHON")]
  ];
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 50, y, size: 8, font: bold, color: GREY });
    page.drawText(value, { x: 190, y, size: 10, font: bold, color: NAVY, maxWidth: width - 240 });
    y -= 23;
  }

  y -= 35;
  page.drawRectangle({ x: 35, y: y - 155, width: width - 70, height: 170, color: rgb(1, 1, 1), borderColor: NAVY, borderWidth: 1.2 });
  page.drawRectangle({ x: 35, y: y - 15, width: width - 70, height: 28, color: NAVY });
  page.drawText("BUS DETAILS", { x: 50, y - 4, size: 12, font: bold, color: rgb(1, 1, 1) });
  y -= 38;
  const busRows = [
    ["Bus name", safe(ticket.busName)],
    ["Bus type", safe(ticket.busType)],
    ["Departure", safe(ticket.departure)],
    ["Arrival", safe(ticket.arrival)],
    ["Duration", safe(ticket.duration)]
  ];
  for (const [label, value] of busRows) {
    page.drawText(label, { x: 50, y, size: 9, font: regular, color: GREY });
    page.drawText(value, { x: 185, y, size: 10, font: bold, color: NAVY, maxWidth: 350 });
    y -= 22;
  }

  y -= 18;
  page.drawRectangle({ x: 35, y: y - 80, width: width - 70, height: 95, color: NAVY });
  page.drawText("AMOUNT PAID", { x: 50, y: y - 12, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText(money(ticket.amount), { x: 50, y: y - 47, size: 24, font: bold, color: GOLD });
  page.drawText("Payment status: PAID", { x: 390, y: y - 47, size: 10, font: bold, color: rgb(1, 1, 1) });

  y -= 112;
  page.drawText("VERIFY TICKET", { x: 42, y, size: 10, font: bold, color: GOLD });
  page.drawText(`Booking ID: ${safe(ticket.bookingId)}`, { x: 42, y: y - 20, size: 10, font: bold, color: NAVY });
  page.drawText("Keep this e-ticket with you while travelling. Present it when requested.", { x: 42, y: y - 40, size: 9, font: regular, color: GREY, maxWidth: width - 84 });

  page.drawRectangle({ x: 0, y: 0, width, height: 46, color: NAVY });
  page.drawText("JANBAHON  |  Assam & Northeast India", { x: 42, y: 18, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText("www.janbahon.in", { x: width - 125, y: 18, size: 9, font: regular, color: GOLD });

  return await pdf.save();
}
