# JANBAHON Bus Owner Portal — Setup

## 1. Run the D1 migration

In the `janbahon-db` D1 Console, run the complete contents of `migrations/0002_owner_portal.sql` once.

## 2. Add R2 storage

Create an R2 bucket for JANBAHON media. Bind it to the Pages project as:

- Binding type: R2 bucket
- Variable name: `MEDIA`
- Bucket: your JANBAHON media bucket

The same private bucket stores bus media and KYC documents. Only the `bus-media/` prefix is publicly served by the application; KYC objects stay private.

## 3. Add encrypted secrets

In Workers & Pages → janbahon → Settings → Variables and Secrets, add these as **encrypted secrets**:

- `OWNER_AUTH_SECRET` — long random secret used to sign owner sessions.
- `OWNER_DATA_KEY` — long random secret used to encrypt bank account numbers before D1 storage.
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

Do not commit these values to GitHub or send them in chat.

## 4. Configure Twilio Verify

Create a Twilio Verify Service with SMS enabled. The owner portal uses that service for mobile OTP login and registration.

## 5. Redeploy

After the D1 migration, R2 binding and secrets are ready, redeploy the Pages project.

## Owner features now included

- Bottom-of-homepage **Bus Owner Login / Register** link.
- Mobile number + OTP authentication.
- New-owner registration with Aadhaar/PAN document upload and bank details.
- Up to **5 bus photos** and **1 bus video** per bus.
- Owner-controlled total seat count.
- Select one or more seats and block them for **1 day**, **1 week**, or **until unblocked**.
- Public bus search reads live D1 availability, including customer bookings and owner-blocked seats.
- Owner bus photos/videos are displayed on public bus listings.
- KYC documents are not exposed through the public media endpoint.
