# Phase 3 Completion Report

## Scope completed

- PostgreSQL persistence through Prisma with no production JSON fallback.
- Relational models for users, profiles, sessions, challenges, audit logs,
  organizations, memberships, campaigns, milestones, donations, ledger events,
  blockchain transactions, and indexer cursors.
- Wallet challenge authentication backed by persistent users and challenges.
- Opaque session tokens stored as SHA-256 hashes, with expiry, logout revocation,
  and automatic revocation when an account becomes inactive.
- Persistent roles and account statuses with the existing authorization
  middleware retained.
- Development-only seed data with valid public Stellar addresses and no secrets.
- Repository-backed campaign, donation, ledger, transaction, and indexer data.

## Persistence policy

Production requires `DATABASE_URL` and Prisma. `STORE_DRIVER=json` is rejected in
production. JSON remains available only as an explicit local/offline test fixture.
Prisma repositories do not import or copy JSON store data.

## Verification completed

- Prisma schema validation and client generation.
- Initial migration applied to an isolated PostgreSQL 16 database.
- Development seed executed successfully.
- PostgreSQL integration tests verified:
  - persistent challenges and one-time consumption;
  - session token hashing and logout revocation;
  - session revocation after user suspension;
  - organization membership uniqueness;
  - campaign/milestone foreign keys;
  - failed-write rollback behavior;
  - persistent, queryable audit records.
- JSON/offline backend regression suite passed.
- Frontend production build passed.
- No IDE lint diagnostics remain.

## Operational commands

```bash
cd remitrelief-backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm test
```

The database integration suite runs when both `STORE_DRIVER=prisma` and
`DATABASE_URL` are provided:

```bash
node --test test/database.test.js
```

## Safety boundary

No deployment was performed. Mainnet remains rejected by configuration. Soroban
interaction remains testnet-only, and database transaction metadata is not
treated as proof of on-chain confirmation.
