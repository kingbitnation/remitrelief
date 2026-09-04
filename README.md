![RemitRelief logo](remitrelief-logo.svg)

# RemitRelief

**Disaster-relief microdonations on Stellar** — donors send USDC to verified campaigns; funds sit in a per-campaign Soroban escrow and release to the recipient only when an authorized relief partner confirms a milestone.

## Authentication Architecture

```text
Wallet Connected  ≠  RemitRelief Authenticated

Connect wallet
   → POST /auth/challenge  (server nonce + network-bound message)
   → Wallet signs message (no on-chain tx)
   → POST /auth/verify     (signature check → SessionRepository.create)
   → HttpOnly cookie (+ Bearer fallback)
   → requireAuth / requireRole / requirePermission / requireOwnership
```

| Concept | Meaning |
|---------|---------|
| **Wallet connected** | Browser extension selected an address |
| **Authenticated** | Server verified a signature and issued a **revocable session** |

Roles: `DONOR` (default) · `RECIPIENT` · `NGO` · `ADMIN`  
Permissions live in `src/auth/permissions.js`. New wallets are never `ADMIN`.

### Auth API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/challenge` | Rate-limited; returns signable message |
| POST | `/auth/verify` | Sets session cookie; returns user + sessionId |
| GET | `/auth/me` | Current session |
| POST | `/auth/logout` | Revokes session + clears cookie |

### Protected vs public

- **Public:** `GET /health`, `/stats`, `/campaigns`, `/campaigns/:id`, `/ledger`
- **Authenticated:** `POST /campaigns`, `/donations`, `/donations/prepare`, `GET /donations`
- **NGO / ADMIN:** milestone prepare-verify + verify
- **ADMIN or internal key:** standalone release; ledger reset also needs `ALLOW_STORE_RESET` (dev only)

Donor identity on donations is taken from the **session**, not the request body.

## Architecture

```
React (WalletContext + AuthContext)
  → Express (helmet, CORS allowlist, cookie sessions)
    → services → repositories → JSON (default) or Postgres adapter
    → blockchain/soroban
```

Persistence default is JSON. Optional `STORE_DRIVER=postgres` + `DATABASE_URL` prepares for Phase 3 — full Prisma migration is **not** in this phase.

## Quick start

```bash
cd remitrelief-backend && cp .env.example .env && npm install && npm run dev
cd remitrelief-frontend && npm install && npm run dev
```

Open `http://localhost:5173`. Connect a wallet and approve the **sign-in** message.

## Tests

```bash
cd remitrelief-backend && npm test
```

## Status

Testnet only. Not audited. Do not use with real funds.

## License

MIT
