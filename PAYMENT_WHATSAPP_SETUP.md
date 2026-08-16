# JANBAHON payment + WhatsApp setup

The code now supports:

- Razorpay Standard Checkout
- Server-side Razorpay order creation
- Server-side HMAC signature verification
- Automatic capture when a payment is only `authorized`
- 15-minute seat reservation while payment is in progress
- Branded JANBAHON PDF e-ticket generation
- WhatsApp confirmation message + PDF e-ticket

## Cloudflare Pages secrets

Add these under **Workers & Pages → janbahon → Settings → Variables and Secrets**.

### Razorpay

- `RAZORPAY_KEY_ID` — Razorpay Test/Live Key ID
- `RAZORPAY_KEY_SECRET` — Razorpay Key Secret (**encrypted secret; never commit it**)

Use Razorpay **Test Mode** first. Switch to live credentials only after successful test payments.

### WhatsApp Cloud API

- `WHATSAPP_ACCESS_TOKEN` — Meta system-user access token with WhatsApp messaging permission
- `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business phone number ID
- `WHATSAPP_GRAPH_VERSION` — optional; defaults to `v23.0`
- `WHATSAPP_TEMPLATE_NAME` — optional approved transactional template name
- `WHATSAPP_TEMPLATE_LANGUAGE` — optional; defaults to `en_US`

For automatic booking notifications sent from the business to a customer who has not opened a WhatsApp conversation, use an approved **UTILITY** template. The code supports a document-header template.

Recommended template:

- Name: `janbahon_booking_confirmation`
- Category: `UTILITY`
- Language: `en_US`
- Header: `DOCUMENT`
- Body: `Hello {{1}}, your JANBAHON booking {{2}} is confirmed for {{3}} on {{4}}. Amount paid: {{5}}. Your e-ticket is attached above.`

The five body variables are passenger first name, booking ID, route, journey date, and amount paid.

If `WHATSAPP_TEMPLATE_NAME` is not configured, the code falls back to a normal text message followed by the PDF document. That fallback is suitable when a WhatsApp conversation is already open; for proactive notifications, use the approved template.

## Payment flow

1. Customer selects seats and enters passenger/WhatsApp details.
2. Server creates a Razorpay order and reserves the seats for 15 minutes.
3. Razorpay Checkout opens.
4. Server verifies the returned payment signature using the server-side Key Secret.
5. Captured payment is fulfilled; pending booking becomes paid/confirmed.
6. A JANBAHON branded PDF ticket is generated.
7. WhatsApp receives the confirmation and PDF ticket.

Do not put the Razorpay Key Secret or WhatsApp access token in frontend code or GitHub.
