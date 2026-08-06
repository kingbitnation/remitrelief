# RemitRelief Backend

Express API + Soroban escrow helpers for RemitRelief.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Platform totals |
| GET | `/campaigns` | List campaigns (`q`, `category`, `status`) |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Campaign + on-chain enrichment |
| POST | `/donations/prepare` | Build unsigned `deposit()` XDR |
| POST | `/donations` | Record a donation |
| GET | `/donations?donor=` | Donor history |
| GET | `/ledger` | Public transparency events |
| GET | `/ledger/stats` | Same stats payload |
| POST | `/milestones/:id/prepare-verify` | Build unsigned `verify_milestone` XDR |
| POST | `/milestones/:id/verify` | Relay signed verify (or demo) |
| POST | `/milestones/:id/release` | Call `release()` (or demo) |

Campaigns, donations, and ledger persist to `data/store.json` between restarts.

## Setup

```bash
npm install
cp .env.example .env
# Optional for on-chain calls:
# BACKEND_SIGNER_SECRET=S...
# DEMO_ESCROW_CONTRACT_ID=C...
npm run dev
```

Without a deployed escrow contract, verify/donate flows run in **demo mode** and update the in-memory ledger.
