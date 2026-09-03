# RemitRelief Backend

Express API + Soroban adapters for RemitRelief.

## Architecture

```
Route → Service → Repository → store.json
              ↘ blockchain/soroban/*
```

## Environment

See `.env.example`. Important:

| Variable | Purpose |
|----------|---------|
| `DEMO_MODE` | Allow demo financial mutations (forced off in production) |
| `STELLAR_NETWORK` | `TESTNET` (default). Mainnet rejected. |
| `BACKEND_SIGNER_SECRET` | Server signer for reads/release — never send to frontend |
| `INTERNAL_API_KEY` | Required for privileged standalone `/release` |
| `DEMO_ESCROW_CONTRACT_ID` | Optional seed campaign escrow |

## Scripts

```bash
npm run dev
npm start
npm test
npm run test:contract
```

## API notes (Phase 2.1)

- `POST /donations` — verifies on-chain deposit **or** records demo when `DEMO_MODE` and no escrow
- `POST /milestones/:id/verify` — validates verify XDR; optional `autoRelease`
- `POST /milestones/:id/release` — demo if `DEMO_MODE`; otherwise requires `x-internal-api-key`
- Ledger events include `verifiedOnChain` + `source` (`on_chain` | `demo`)
