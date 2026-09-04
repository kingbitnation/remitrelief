import { logger } from "../lib/logger.js";

export const AuditEvents = Object.freeze({
  AUTH_CHALLENGE_CREATED: "AUTH_CHALLENGE_CREATED",
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILURE: "AUTH_FAILURE",
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_REVOKED: "SESSION_REVOKED",
  LOGOUT: "LOGOUT",
  AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED",
});

/**
 * Auth audit foundation — Phase 3 can persist these to PostgreSQL.
 * Never log secrets, signatures, or private keys.
 */
export function recordAuthAudit(event, meta = {}) {
  const safe = {
    event,
    at: new Date().toISOString(),
    walletAddress: meta.walletAddress || null,
    sessionId: meta.sessionId ? String(meta.sessionId).slice(0, 8) + "…" : null,
    reason: meta.reason || null,
    path: meta.path || null,
    role: meta.role || null,
  };
  logger.info("auth.audit", safe);
  return safe;
}
