/**
 * Repository boundary over the JSON store.
 * Phase 3 can swap this for PostgreSQL without rewriting routes.
 */

import * as store from "../data/store.js";

export const campaignsRepo = {
  list: (filters) => store.listCampaigns(filters),
  getById: (id) => store.getCampaign(id),
  create: (input) => store.createCampaign(input),
  setMilestonesVerified: (id, count) => store.setMilestonesVerified(id, count),
};

export const donationsRepo = {
  list: (filters) => store.listDonations(filters),
  findByTxHash: (txHash) => store.findDonationByTxHash(txHash),
  create: (input) => store.recordDonation(input),
};

export const ledgerRepo = {
  list: (filters) => store.listLedger(filters),
  append: (event) => store.appendLedger(event),
};

export const statsRepo = {
  get: () => store.getStats(),
  reset: () => store.resetStore(),
};
