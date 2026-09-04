import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createChallenge,
  completeLogin,
  logoutSession,
  getMeFromSession,
} from "../services/authService.js";
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
} from "../middleware/auth.js";
import { toErrorResponse } from "../lib/errors.js";
import { loadConfig } from "../config.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth requests", code: "RATE_LIMITED" },
});

router.use(authLimiter);

router.post("/challenge", async (req, res) => {
  try {
    const result = await createChallenge({
      publicKey: req.body?.publicKey || req.body?.walletAddress,
    });
    res.json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.post("/verify", async (req, res) => {
  try {
    const result = await completeLogin({
      publicKey: req.body?.publicKey || req.body?.walletAddress,
      nonce: req.body?.nonce,
      signature: req.body?.signature,
      signedMessage: req.body?.signedMessage || req.body?.message,
    });
    setSessionCookie(res, result.sessionId);
    res.json({
      authenticated: true,
      expiresAt: result.expiresAt,
      expiresIn: result.expiresIn,
      user: result.user,
      // sessionId also returned for Bearer fallback (SPA proxies); cookie is primary
      sessionId: result.sessionId,
    });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.post("/logout", async (req, res) => {
  try {
    const cfg = loadConfig();
    const sid =
      req.cookies?.[cfg.auth.cookieName] ||
      req.body?.sessionId ||
      (req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim() ||
      null;
    await logoutSession(sid);
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) {
    clearSessionCookie(res);
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    res.json(await getMeFromSession(req.sessionId));
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
