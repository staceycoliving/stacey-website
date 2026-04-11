# Disaster Recovery — STACEY Coliving Website

What to do when something is on fire. Read this once now, not at 3 AM during the
incident. Bookmark this file in your password manager.

---

## 1. Database (Supabase Postgres)

### Backup strategy

Supabase runs **Point-in-Time Recovery (PITR)** depending on plan:

- **Free tier:** Daily backups, 7 days retention. No PITR.
- **Pro tier ($25/mo):** Daily backups + PITR. Restore to any point in the
  last 7 days, granularity to the minute.
- **Pro tier add-on (PITR 14d/28d):** Extends the PITR window.

Check the current plan + retention here:
**https://supabase.com/dashboard/project/_/database/backups**

For STACEY's risk profile (real money flowing through booking + rent), the
**minimum acceptable** is Pro tier with PITR — recoverable to any minute in
the last 7 days. Free-tier daily snapshots mean a worst-case loss of 24h
of bookings, which is unacceptable for live operations.

### How to restore (Pro tier with PITR)

1. Go to Supabase Dashboard → your project → **Database** → **Backups**
2. Click **Restore to a point in time**
3. Pick the timestamp (just before the incident — e.g. "5 minutes before
   the bad migration was run")
4. Confirm. Supabase creates a new database with the restored state.
5. Update `DATABASE_URL` and `DIRECT_URL` in Vercel env vars to point to
   the new database
6. Trigger a redeploy: `vercel deploy --prod --yes`

**Time-to-restore (TTR):** typically 5–15 minutes for a small DB.

### How to restore (Free tier)

1. Supabase Dashboard → Database → Backups → pick the most recent daily snapshot
2. Same steps as above

You will lose any data created after the snapshot.

### What CANNOT be restored from the DB alone

- **Stripe payments** — these live in Stripe. The DB only mirrors them.
  After a restore, run a Stripe reconciliation: any `RentPayment` row in
  PROCESSING/PAID status should be cross-checked against
  https://dashboard.stripe.com/payments
- **apaleo SHORT stay bookings** — these live in apaleo, not in the DB at
  all. SHORT stay locations (Alster, Downtown) are not affected by a DB
  restore.
- **Yousign signed leases** — these live in Yousign. After a restore, any
  Booking row with `signatureRequestId` set should still have its signed
  PDF retrievable from Yousign's dashboard.

---

## 2. Booking flow is broken (Stripe / apaleo / DB error)

### Quick triage

1. Open Sentry: https://sentry.io → stacey-real-estate-gmbh → javascript-nextjs
2. Filter by `area` tag: `booking-short`, `booking-long`, `stripe-webhook`,
   `availability-apaleo`, `lease-generate`
3. Look at the most recent 1–2 issues — they almost certainly explain it.

### If Stripe webhooks are the problem

- Check Stripe Dashboard → Developers → Webhooks → your endpoint → Recent
  deliveries. Look for failed events.
- A single failed event will be retried by Stripe automatically (up to
  3 days, exponentially).
- The `WebhookEvent` table in our DB is the idempotency log: every
  successfully processed event ID lives here. If a retry hits an already-
  processed event, we 200 it silently.
- To **manually replay** a failed event: Stripe Dashboard → the event →
  "Resend" button.

### If apaleo is down

- SHORT stay availability + booking will fail. The frontend already shows
  "Sold out" gracefully (not the wrong fallback price).
- LONG stay is not affected.
- Check apaleo status: https://status.apaleo.com

---

## 3. Cron job didn't run

- Vercel Cron logs: https://vercel.com/matteo-2914s-projects/stacey-website/crons
- Manually trigger: there's a "Run now" button per cron job in the dashboard.
- The two crons:
  - `/api/cron/daily` — runs at 08:00 UTC
  - `/api/cron/monthly-rent` — runs on the 1st of each month at 06:00 UTC
- Both check the `Authorization: Bearer ${CRON_SECRET}` header. If you ever
  rotate `CRON_SECRET`, no code change needed — Vercel injects it
  automatically.

---

## 4. Emails are going to real users when they shouldn't (TEST MODE)

**TEST_MODE_EMAILS** is the safety whitelist. If it's set, only addresses
in the comma-separated list receive any outgoing email; everything else is
silently dropped and logged.

To **enable** test mode:
```
TEST_MODE_EMAILS="matteo@stacey.de,booking@stacey.de"
```

To **disable** (go fully live):
- Vercel Dashboard → Project → Settings → Environment Variables → delete
  `TEST_MODE_EMAILS`
- Or via CLI: `vercel env rm TEST_MODE_EMAILS production`

**The yellow banner in the admin dashboard reflects this setting** — if
the banner says "TEST MODE: only matteo@/booking@ receive emails", you're
safe. If the banner is gone, all emails go live.

---

## 5. Need to rotate a secret

### Stripe secret keys

1. Stripe Dashboard → Developers → API keys → Roll the secret key
2. Vercel: `vercel env rm STRIPE_SECRET_KEY production` then
   `vercel env add STRIPE_SECRET_KEY production --value sk_live_...`
3. Redeploy: `vercel deploy --prod --yes`

### Stripe webhook secret

1. Stripe Dashboard → Developers → Webhooks → your endpoint → Roll secret
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel (same as above)
3. Redeploy

### Admin password

1. Generate: `openssl rand -hex 16 | tr -d '\n\r '`
2. Update `ADMIN_PASSWORD` in Vercel
3. Redeploy
4. Save the new value in your password manager

### Cron secret

1. Generate: `openssl rand -hex 32 | tr -d '\n\r '`
2. Update `CRON_SECRET` in Vercel — Vercel cron jobs pick it up automatically
3. Redeploy

### Yousign API key

1. Yousign Dashboard → API → New key
2. Update `YOUSIGN_API_KEY` in Vercel
3. Redeploy

### Resend API key

1. Resend Dashboard → API keys → New
2. Update `RESEND_API_KEY` in Vercel
3. Redeploy

### Sentry DSN

DSNs are public-ish (only useful for sending events to your project), so
rotating them is rare. If needed: Sentry Dashboard → project Settings →
Client Keys → Reset.

---

## 6. Local environment broken (lib/env.ts validation failing)

If `npm run dev` fails with "Invalid server environment variables":

1. Run: `vercel env pull .env.local --environment=development`
2. This downloads the latest env vars from Vercel into your local file.
3. Restart the dev server.

If that still fails, compare `.env.local` against `.env.example` — every
required variable in `.env.example` must exist in `.env.local`.

---

## 7. Contact tree (who do we call)

- **Vercel deployment broken:** Vercel status page + retry deploy
- **Supabase down:** https://status.supabase.com — usually self-resolves in <30 min
- **Stripe down:** https://status.stripe.com
- **apaleo down:** https://status.apaleo.com
- **Resend (email) down:** https://status.resend.com
- **Yousign down:** check Yousign status page

---

## 8. Things that are NOT in the DB and need their own backup

- **Static images** in `public/images/` — git-tracked.
- **Lease template** `public/templates/mietvertrag.docx` — git-tracked.
- **All source code** — git-tracked, mirrored on GitHub.

The git repo at github.com/staceycoliving/stacey-website is your second
source of truth for everything except DB rows + Stripe state.
