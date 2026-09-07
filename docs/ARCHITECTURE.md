# RemitRelief Architecture (Phase 3)

```text
React Frontend (WalletContext + AuthContext)
        │
        ▼
Express API (helmet, CORS allowlist, cookies)
        │
        ▼
Auth + Authorization middleware
        │
        ▼
Services (auth, campaigns, donations, milestones, indexer)
        │
        ├──────────────────────┐
        ▼                      ▼
Repositories              Blockchain / Soroban
        │                      │
        ▼                      ▼
Prisma Client              Stellar TESTNET
        │
        ▼
PostgreSQL
```

## Persistence rules

- **Production:** Prisma → PostgreSQL only (`DATABASE_URL` required).
- **Local tests without DB:** `STORE_DRIVER=json` uses `src/data/store.js` fixtures only.
- Never silently fall back from Postgres to JSON when Postgres was configured.

## Auth

Wallet signature proves ownership. Sessions are server-side rows; cookie carries an opaque token; DB stores **SHA-256 hash** only.

## Blockchain vs database

PostgreSQL may store transaction hashes and ledger events. Confirmation of on-chain success remains the Soroban verification path in `src/blockchain/soroban/`.
