![RemitRelief logo](remitrelief-logo.svg)

# RemitRelief

**Disaster-relief microdonations on Stellar** — donors send USDC to verified campaigns; funds sit in a per-campaign Soroban escrow and release to the recipient only when an authorized relief partner confirms a milestone. A public ledger distinguishes **on-chain verified** events from **demo/app** events.

## Architecture (current)

```
React SPA (Vite)
      ↓ REST
Express API
  ├── routes → services → repositories → JSON store
  └── blockchain/soroban (client, transactions, verification)
      ↓
Soroban escrow contract (testnet)
```

Persistence today is a **file-backed JSON store** (`remitrelief-backend/data/store.json`, or `/tmp` on Vercel). PostgreSQL is planned for Phase 3 behind the repository interface — **SQLite is not used**.

| Piece | Path | Role |
|-------|------|------|
| Frontend | `remitrelief-frontend/` | Campaigns, donate, ledger, verify UI |
| Backend | `remitrelief-backend/` | API, verification, escrow helpers |
| Contract | `remitrelief-backend/src/contracts/escrow-contract/` | Milestone escrow |
| Deploy adapter | `api/` + `vercel.json` | Serverless Express + static UI |

## Security model (Phase 2.1)

- **Demo mode** (`DEMO_MODE=true`) allows local fake donations/verify/release. Forced **off** when `NODE_ENV=production`.
- **On-chain donations** require a successful Soroban `deposit` tx hash; the backend verifies before recording.
- **Verify XDR** is checked for expected contract / function / args before submit.
- **Standalone release** requires `x-internal-api-key: $INTERNAL_API_KEY`. After a validated verifier signature, verify may `autoRelease` server-side.
- **`BACKEND_SIGNER_SECRET`** is backend-only — never expose via `VITE_*`.

## Quick start

```bash
# API
cd remitrelief-backend
cp .env.example .env   # set DEMO_MODE=true for local demo flows
npm install
npm run dev

# UI (separate terminal)
cd remitrelief-frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Without a deployed escrow, campaigns use **demo mode**. For on-chain deposits set `DEMO_ESCROW_CONTRACT_ID`, `BACKEND_SIGNER_SECRET`, and `INTERNAL_API_KEY` (see `.env.example`).

## Tests

```bash
cd remitrelief-backend
npm test                 # Node security/config/service tests
npm run test:contract    # Soroban escrow Rust tests (requires Rust + cargo)
```

## Contract events

Escrow emits Soroban events (topics):

| Event | Topics | Data |
|-------|--------|------|
| init | `init`, recipient | token, verifier_count, milestone_count |
| deposit | `deposit`, from | amount, total_deposited |
| verify | `verify`, verifier, index | amount |
| release | `release`, recipient, index | amount |

## Status

Early-stage / testnet. Smart contracts and infrastructure are **not audited**. Do not use with real funds. Mainnet is disabled in config.

## License

MIT
