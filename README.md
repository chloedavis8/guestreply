# GuestReply

AI-written replies to guest reviews for restaurants and hotels.
Built by **Chloe Davis** for HM 480 (Penn State).

## What it does
- **Accounts:** sign up, log in, log back in later. Stored in a Neon Postgres database.
- **Saved business profile:** name, type, tone and details, used in every reply.
- **Batch replies (AI):** paste up to 10 guest reviews and Claude writes a tailored reply to each.
- **Pattern report (AI):** Claude reads recent reviews and flags recurring problems and praise, with a fix for each problem.
- **Payments:** Stripe Checkout for GuestReply Pro ($15/month). Free accounts get 5 replies.
- **Demo account:** `demo@demo.com` / `password123!` is created automatically with full Pro access.

## How it's built
- Static pages in `public/` (homepage, sign up, log in, dashboard)
- Vercel serverless functions in `api/`
- Shared code in `lib/` (database, login sessions, AI)
- Only dependency: `pg` (Postgres driver)

## Environment variables (set in Vercel, never in code)
| Name | What it is |
|---|---|
| `DATABASE_URL` | Added automatically when Neon is connected through Vercel |
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com |
| `STRIPE_SECRET_KEY` | Stripe secret key (test key `sk_test_...` until Week 4) |
| `AUTH_SECRET` | Optional. Random text used to sign login cookies |

Tables are created automatically the first time the app runs.
