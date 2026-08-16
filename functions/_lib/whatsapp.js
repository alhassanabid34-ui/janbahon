function graphBase(env) {
  const version = String(env.WHATSAPP_GRAPH_VERSION || "v23.0").replace(/^v?/, "v");
  return `https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
}

async function graph(env, path, options = {}) {
  const response = await fetch(`${graphBase(env)}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, ...(options.headers || {}) }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: { message: text.slice(0, 500) } }; }
  if (!response.ok) throw new Error(data?.error?.message || `WhatsApp API error (${response.status})`);
  return data;
}

export async function sendBookingWhatsApp(env, ticket, pdfBytes) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { sent: false, skipped: true, reason: "WhatsApp credentials are not configured." };
  }

  const phone = String(ticket.whatsapp || "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) return { sent: false, skipped: true, reason: "Passenger WhatsApp number is invalid." };
  const to = `91${phone}`;

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), `${ticket.bookingId}.pdf`);
  const upload = await graph(env, "/media", { method: "POST", body: form });
  const mediaId = upload.id;
  if (!mediaId) throw new Error("WhatsApp did not return a media id.");

  const firstName = String(ticket.passengers?.[0]?.name || "Passenger").split(/\s+/)[0];
  const dateText = ticket.journeyDate;
  const route = `${ticket.fromCity} to ${ticket.toCity}`;

  if (env.WHATSAPP_TEMPLATE_NAME) {
    const bodyParameters = [firstName, ticket.bookingId, route, dateText, `Rs ${Number(ticket.amount || 0).toLocaleString("en-IN")}`].map(text => ({ type: "text", text: String(text) }));
    await graph(env, "/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: env.WHATSAPP_TEMPLATE_NAME,
          language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US" },
          components: [
            { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename: `${ticket.bookingId}.pdf` } }] },
            { type: "body", parameters: bodyParameters }
          ]
        }
      })
    });
    return { sent: true, mode: "template", mediaId };
  }

  await graph(env, "/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: `JANBAHON booking confirmed.\nBooking ID: ${ticket.bookingId}\n${route}\nJourney date: ${dateText}\nSeat(s): ${(ticket.passengers || []).map(p => p.seat).join(", ")}\nAmount paid: Rs ${Number(ticket.amount || 0).toLocaleString("en-IN")}\nYour e-ticket PDF is attached.` }
    })
  });

  await graph(env, "/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: { id: mediaId, caption: "JANBAHON e-ticket", filename: `${ticket.bookingId}.pdf` }
    })
  });
  return { sent: true, mode: "document", mediaId };
}
