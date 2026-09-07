import { createHash, randomBytes } from "node:crypto";

/** Opaque session token for cookie/Bearer (never store raw in DB). */
export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
