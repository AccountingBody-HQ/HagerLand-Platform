# HagerLand

The global network for Ethiopian business, community, and culture.

Live at [hagerland.com](https://hagerland.com)

## What this is

HagerLand is the trusted digital home of the Ethiopian diaspora:

- A searchable, verified directory of Ethiopian-owned businesses worldwide
- Community sections: jobs, housing, cars & taxi, tutors, community organisations, events
- An admin console for reviewing every listing before it goes live

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (Postgres)
- **Email:** Resend
- **Bot protection:** Cloudflare Turnstile + honeypot field
- **Hosting:** Vercel
- **Organisation:** AccountingBody-HQ on GitHub

## Getting started

```bash
cp .env.example .env.local
# Fill in all values
npm install
npm run dev
```

## Admin console

Available at `/roodber8`. Requires username, password, and 6-digit TOTP code.
Do not share, rename, or publicise this path.

## Build and deploy

```bash
rm -rf .next && npm run build # must be green before every commit
git push # Vercel auto-deploys on push to main
```

## Build guide

See `HagerLand_Build_Guide_v7.md` for the complete sequential build plan.
The guide covers all 10 sessions, every file, every line of code.
