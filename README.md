![RemitRelief logo](remitrelief-logo.svg)

# RemitRelief

Instant disaster-relief microdonations on Stellar. Donors deposit USDC into a Soroban escrow; funds release only after NGO-verified milestones.

## Stack

- **Frontend** — React / Vite / Stellar Wallets Kit
- **Backend** — Express + `@stellar/stellar-sdk` (Soroban RPC)
- **Contract** — milestone escrow (`remitrelief-backend/src/contracts/escrow-contract`)

## Quick start

```bash
# API
cd remitrelief-backend && npm install && npm run dev

# UI (separate terminal)
cd remitrelief-frontend && npm install && npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). Demo campaigns work without a deployed contract; set `DEMO_ESCROW_CONTRACT_ID` and `BACKEND_SIGNER_SECRET` for on-chain deposits.
