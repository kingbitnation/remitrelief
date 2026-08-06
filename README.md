![RemitRelief logo](remitrelief-logo.svg)

# RemitRelief

**Disaster-relief microdonations on Stellar** — donors send USDC to verified campaigns; funds sit in a per-campaign Soroban escrow and release to the recipient only when an authorized relief partner confirms a milestone (for example, “shelter distribution complete”). Every donation and payout is visible on a public transparency ledger.

## Why Stellar

- **Microdonations need tiny fees.** Sub-second finality and sub-cent network costs make small gifts practical, including cross-border.
- **Stable unit of account.** USDC on Stellar gives donors a familiar USD amount without FX gymnastics in the UX.
- **Programmable custody.** Soroban encodes the release condition in the escrow contract itself: funds move to a fixed recipient only after a verified milestone, instead of trusting an off-chain intermediary to hold the money.

## How it works

1. **Campaign setup** — A relief campaign is registered with a goal, milestones (description + tranche size), a recipient address, authorized verifiers (NGO partners), and a deployed escrow contract instance.
2. **Donate** — A donor connects a Stellar wallet, picks a campaign, and deposits USDC into that campaign’s escrow via a Soroban `deposit` invocation.
3. **Verify** — When on-the-ground work for a milestone is done, an authorized verifier confirms it on-chain (`verify_milestone`).
4. **Release** — The matching tranche is released from escrow to the campaign recipient (`release`).
5. **Transparency** — The backend indexes donations and milestone events so anyone can inspect a public ledger of activity.

## Architecture

```
┌─────────────────────┐     REST      ┌──────────────────────┐
│  remitrelief-frontend│ ───────────► │  remitrelief-backend │
│  React + Vite        │              │  Express + store     │
└──────────┬──────────┘              └──────────┬───────────┘
           │                                    │
           │         Soroban RPC / Stellar      │
           └────────────────┬───────────────────┘
                            ▼
                 ┌─────────────────────┐
                 │  Escrow contract    │
                 │  (per campaign)     │
                 │  deposit / verify /  │
                 │  release / balance  │
                 └─────────────────────┘
```

This repository is a monorepo:

| Piece | Path | Role |
|-------|------|------|
| Frontend | `remitrelief-frontend/` | Campaign browsing, wallet connect, donate, ledger, verify UI |
| Backend | `remitrelief-backend/` | Campaign/milestone/donation API, Soroban service, escrow contract |
| Deploy | `api/` + `vercel.json` | Vercel serverless entry for the Express API + static UI |

## Quick start

```bash
# API
cd remitrelief-backend && npm install && npm run dev

# UI (separate terminal)
cd remitrelief-frontend && npm install && npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). Demo campaigns work without a deployed contract; set `DEMO_ESCROW_CONTRACT_ID` and `BACKEND_SIGNER_SECRET` for on-chain deposits.

## Deploy

```bash
npx vercel --prod
```

Same-origin API routes (`/campaigns`, `/donations`, `/ledger`, …) are rewritten to the serverless Express app.

## Status

Early-stage. **Stellar testnet only. Smart contracts and infrastructure are not audited. Do not use with real funds.**

## License

MIT
