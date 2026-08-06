# RemitRelief Frontend

React + Vite donor experience for milestone-escrowed disaster relief on Stellar.

## Pages

- `/` — campaign list with search, category chips, sort
- `/campaigns/:id` — detail, milestones, activity, share
- `/create` — create a campaign with milestone tranches
- `/dashboard` — donor history (shared wallet state)
- `/ledger` — public transparency ledger with filters
- `/verify` — NGO milestone verify + proof note + release

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Requires the API at `VITE_API_URL` (default `http://localhost:4000`).
