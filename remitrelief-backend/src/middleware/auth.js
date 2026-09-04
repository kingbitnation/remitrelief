import { loadConfig } from "../config.js";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { resolveSession } from "../services/authService.js";
import { hasAnyRole, Roles } from "../auth/roles.js";
import { roleHasPermission } from "../auth/permissions.js";
import { AuditEvents, recordAuthAudit } from "../auth/audit.js";

function readSessionId(req) {
  const cfg = loadConfig();
  const fromCookie = req.cookies?.[cfg.auth.cookieName];
  if (fromCookie) return fromCookie;
  const header = req.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (match) return match[1].trim();
  return null;
}

export function setSessionCookie(res, sessionId) {
  const cfg = loadConfig();
  res.cookie(cfg.auth.cookieName, sessionId, {
    httpOnly: true,
    secure: cfg.auth.cookieSecure,
    sameSite: cfg.auth.cookieSameSite,
    maxAge: cfg.auth.sessionTtlSec * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  const cfg = loadConfig();
  res.clearCookie(cfg.auth.cookieName, {
    httpOnly: true,
    secure: cfg.auth.cookieSecure,
    sameSite: cfg.auth.cookieSameSite,
    path: "/",
  });
}

export async function optionalAuth(req, _res, next) {
  try {
    const sid = readSessionId(req);
    if (!sid) {
      req.user = null;
      req.sessionId = null;
      return next();
    }
    try {
      const ctx = await resolveSession(sid);
      req.user = {
        id: ctx.userId,
        userId: ctx.userId,
        walletAddress: ctx.walletAddress,
        publicKey: ctx.walletAddress,
        roles: ctx.roles,
        permissions: ctx.permissions,
        sessionId: ctx.sessionId,
      };
      req.sessionId = ctx.sessionId;
    } catch {
      req.user = null;
      req.sessionId = null;
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Alias used by older route wiring */
export const optionalWalletAuth = optionalAuth;

export function requireAuth(req, res, next) {
  optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user?.walletAddress) {
      return next(new AppError(ErrorCodes.AUTH_REQUIRED, "Authentication required"));
    }
    return next();
  });
}

export const requireWalletAuth = requireAuth;

export function requireRole(...roles) {
  const required = roles.length ? roles : [Roles.DONOR];
  return (req, res, next) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      if (!hasAnyRole(req.user.roles, required)) {
        recordAuthAudit(AuditEvents.AUTHORIZATION_DENIED, {
          walletAddress: req.user.walletAddress,
          reason: "role_required",
          path: req.path,
          role: required.join(","),
        });
        return next(
          new AppError(ErrorCodes.ROLE_REQUIRED, `Requires role: ${required.join(" or ")}`, {
            details: { roles: req.user.roles },
          })
        );
      }
      return next();
    });
  };
}

export function requirePermission(...perms) {
  return (req, res, next) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      const ok = perms.some((p) => roleHasPermission(req.user.roles, p));
      if (!ok) {
        recordAuthAudit(AuditEvents.AUTHORIZATION_DENIED, {
          walletAddress: req.user.walletAddress,
          reason: "permission_denied",
          path: req.path,
        });
        return next(
          new AppError(ErrorCodes.PERMISSION_DENIED, `Missing permission: ${perms.join(" or ")}`)
        );
      }
      return next();
    });
  };
}

/**
 * Ownership check — resourceOwner must match authenticated wallet (or ADMIN).
 * `resolveOwner` may be sync or async: (req) => walletAddress|null
 */
export function requireOwnership(resolveOwner) {
  return (req, res, next) => {
    requireAuth(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (hasAnyRole(req.user.roles, [Roles.ADMIN])) return next();
        const owner = await resolveOwner(req);
        if (!owner || owner !== req.user.walletAddress) {
          recordAuthAudit(AuditEvents.AUTHORIZATION_DENIED, {
            walletAddress: req.user.walletAddress,
            reason: "ownership",
            path: req.path,
          });
          return next(new AppError(ErrorCodes.FORBIDDEN, "You do not own this resource"));
        }
        return next();
      } catch (e) {
        return next(e);
      }
    });
  };
}

/** INTERNAL_API_KEY or authenticated ADMIN (or NGO for release approve). */
export function requireOperatorOrInternalKey(req, res, next) {
  const key = req.get("x-internal-api-key") || req.body?.internalApiKey;
  const cfg = loadConfig();
  if (cfg.secrets.internalApiKey && key && key === cfg.secrets.internalApiKey) {
    req.internalAuthorized = true;
    return next();
  }

  optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (hasAnyRole(req.user?.roles, [Roles.ADMIN])) {
      req.operatorAuthorized = true;
      return next();
    }
    return next(
      new AppError(ErrorCodes.AUTH_REQUIRED, "Admin session or internal API key required")
    );
  });
}

export function requireAdminOrDevReset(req, res, next) {
  const cfg = loadConfig();
  if (!cfg.allowStoreReset) {
    return next(new AppError(ErrorCodes.FORBIDDEN, "reset disabled"));
  }
  return requireRole(Roles.ADMIN)(req, res, next);
}
