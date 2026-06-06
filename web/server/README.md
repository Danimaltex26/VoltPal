# VoltPal server

Express API (deployed on Vercel as the serverless function `api/index.js`). Hosts
the public cert-prep quiz and its Resend-powered results email.

## Required environment variables

| Var | Purpose | Notes |
|-----|---------|-------|
| `SUPABASE_URL` | Supabase project URL | shared TradePals project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB writes (quiz_leads, reads training_questions) | secret — server only |
| `RESEND_API_KEY` | Sends the quiz-results email via Resend | **required for email** — see below |
| `PUBLIC_QUIZ_TOKEN_SECRET` | HMAC secret for quiz session tokens | optional; falls back to service-role key |

### RESEND_API_KEY — required, or quiz emails silently no-op

The public-quiz `/submit` route fires `sendQuizResultsEmail` (`utils/email.js`).
If `RESEND_API_KEY` is **not set**, that function logs
`"RESEND_API_KEY not set — skipping quiz results email"` and returns — the lead is
still captured in `quiz_leads`, but **no email is sent**. This is silent: no error
surfaces to the user.

> **Serverless gotcha (the real cause of the 2026-06-05 "no quiz email" bug):** the
> `/submit` route must `await sendQuizResultsEmail(...)` before `res.json()`. On Vercel
> the function is frozen/killed once the response returns, so a fire-and-forget send
> never completes and the email silently drops — even with the key set. The `quiz_leads`
> insert is awaited, so leads still capture, which makes it look like only email is broken.

**Set it in TWO places:**
1. **Vercel** → VoltPal project → Settings → Environment Variables (Production +
   Preview), then redeploy. This is what fixes live quiz-takers — Vercel does not
   read the local `.env`.
2. Local `.env` (this directory) for local testing/parity.

Emails are sent **from `noreply@tradepals.net`** (hardcoded in `utils/email.js`).
That domain is already verified in the Resend account SplicePal uses, so reusing the
**same `RESEND_API_KEY` as SplicePal** needs no DNS/domain setup. A separate Resend
account would require verifying `tradepals.net` (SPF/DKIM) first.

### Quick local test
With `RESEND_API_KEY` set, take the public quiz (enter an email, finish it) and
check that the results email arrives. On failure, the server logs a
`Resend quiz results email error: <status> <body>` line — a 403/422 there usually
means an unverified sending domain or a bad/restricted key.
