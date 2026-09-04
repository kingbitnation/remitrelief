/** Canonical RemitRelief roles (Phase 2.2). */

export const Roles = Object.freeze({
  UNASSIGNED: "UNASSIGNED",
  DONOR: "DONOR",
  RECIPIENT: "RECIPIENT",
  NGO: "NGO",
  ADMIN: "ADMIN",
});

export const ALL_ROLES = Object.freeze(Object.values(Roles));

/** Map legacy Phase-early role strings → canonical roles. */
export function normalizeRole(role) {
  if (!role) return Roles.DONOR;
  const r = String(role).toUpperCase();
  if (ALL_ROLES.includes(r)) return r;
  const legacy = {
    DONOR: Roles.DONOR,
    ORGANIZER: Roles.NGO,
    VERIFIER: Roles.NGO,
    OPERATOR: Roles.ADMIN,
    ADMIN: Roles.ADMIN,
    NGO: Roles.NGO,
    RECIPIENT: Roles.RECIPIENT,
    UNASSIGNED: Roles.UNASSIGNED,
  };
  return legacy[r] || Roles.DONOR;
}

export function normalizeRoles(roles = []) {
  const set = new Set((roles || []).map(normalizeRole));
  if (set.size === 0) set.add(Roles.DONOR);
  set.delete(Roles.UNASSIGNED);
  return [...set];
}

export function hasAnyRole(userRoles, required) {
  const have = new Set((userRoles || []).map(normalizeRole));
  return required.some((r) => have.has(normalizeRole(r)));
}
