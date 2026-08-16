# JANBAHON Bus Owner Portal — Setup

## 1. Run the D1 migrations

In the `janbahon-db` D1 Console, run the required migration files in order, including `migrations/0003_2factor_otp.sql` and `migrations/0004_customer_auth.sql` once.

Customer authentication also self-initializes its `users` table if the migration has not yet been applied, so a first `/api/auth` request will create the table automatically.

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
- `TWOFACTOR_API_KEY` — your 2Factor API key.
- `TWOFACTOR_OTP_TEMPLATE` — optional; defaults to `JNBHN1`, the approved JANBAHON OTP template.
- `USER_AUTH_SECRET` — optional separate long random secret for passenger sessions. If omitted, passenger login reuses `OWNER_AUTH_SECRET` so the existing setup continues to work.

Do not commit these values to GitHub or send them in chat.

## 4. Configure 2Factor OTP

JANBAHON uses the same 2Factor account/API key for passenger and bus-owner phone verification.

- Send OTP: 2Factor `AUTOGEN` endpoint.
- Verify OTP: 2Factor `VERIFY3` endpoint using **mobile number + OTP**.
- JANBAHON does not store the actual OTP.
- The backend keeps only a short-lived resend/attempt record in D1.
- Passenger and bus-owner flows use different `purpose` values so their rate limits and verification records remain separate while using the same 2Factor account.

## 5. Passenger account features

- Login from the main header using mobile number + password.
- Alternative OTP login by SMS.
- Sign up using mobile number + SMS OTP + password.
- Forgot password using SMS OTP and a new password.
- Passwords are stored as PBKDF2-SHA-256 derived hashes with a unique random salt; the plain password is never stored.
- Sessions use an HttpOnly, Secure, SameSite cookie.

## 6. Redeploy

After the D1 migration, R2 binding and encrypted secrets are ready, redeploy the Pages project.

## Owner features included

- Bottom-of-homepage **Bus Owner Login / Register** link.
- Mobile number + OTP authentication.
- New-owner registration with Aadhaar/PAN document upload and bank details.
- Up to **5 bus photos** and **1 bus video** per bus.
- Owner-controlled total seat count.
- Select one or more seats and block them for **1 day**, **1 week**, or **until unblocked**.
- Public bus search reads live D1 availability, including customer bookings and owner-blocked seats.
- Owner bus photos/videos are displayed on public bus listings.
- KYC documents are not exposed through the public media endpoint.
