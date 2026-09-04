/**
 * Repository boundary — JSON (default) or Postgres when STORE_DRIVER/DATABASE_URL set.
 */

import { loadConfig } from "../config.js";

const driver = (() => {
  try {
    return loadConfig().storeDriver;
  } catch {
    return "json";
  }
})();

const impl =
  driver === "postgres"
    ? await import("./postgres/index.js")
    : await import("./jsonRepos.js");

export const campaignsRepo = impl.campaignsRepo;
export const donationsRepo = impl.donationsRepo;
export const ledgerRepo = impl.ledgerRepo;
export const statsRepo = impl.statsRepo;
export const usersRepo = impl.usersRepo;
export const sessionsRepo = impl.sessionsRepo;
export const indexerRepo = impl.indexerRepo;
