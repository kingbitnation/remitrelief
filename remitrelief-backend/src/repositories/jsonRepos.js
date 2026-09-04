import * as store from "../data/store.js";

export const campaignsRepo = {
  list: async (filters) => store.listCampaigns(filters),
  getById: async (id) => store.getCampaign(id),
  create: async (input) => store.createCampaign(input),
  setMilestonesVerified: async (id, count) => store.setMilestonesVerified(id, count),
};

export const donationsRepo = {
  list: async (filters) => store.listDonations(filters),
  findByTxHash: async (txHash) => store.findDonationByTxHash(txHash),
  create: async (input) => store.recordDonation(input),
};

export const ledgerRepo = {
  list: async (filters) => store.listLedger(filters),
  append: async (event) => store.appendLedger(event),
  findExisting: async (query) => store.findLedgerEvent(query),
};

export const statsRepo = {
  get: async () => store.getStats(),
  reset: async () => store.resetStore(),
};

export const usersRepo = {
  getByPublicKey: async (publicKey) => store.getUser(publicKey),
  upsertFromLogin: async (publicKey) => store.upsertUser(publicKey),
  addRole: async (publicKey, role) => store.addUserRole(publicKey, role),
  saveChallenge: async (row) => store.saveAuthChallenge(row),
  getChallenge: async (publicKey, nonce) => store.getAuthChallenge(publicKey, nonce),
  consumeChallenge: async (publicKey, nonce) => store.consumeAuthChallenge(publicKey, nonce),
};

/** SessionRepository — Phase 3 can swap to PostgreSQL without rewriting auth services. */
export const sessionsRepo = {
  create: async (input) => store.createSession(input),
  find: async (id) => store.findSession(id),
  touch: async (id) => store.touchSession(id),
  revoke: async (id) => store.revokeSession(id),
  revokeAllForUser: async (userId) => store.revokeAllSessionsForUser(userId),
};

export const indexerRepo = {
  getCursor: async (key) => store.getIndexerCursor(key),
  setCursor: async (key, value) => store.setIndexerCursor(key, value),
};
