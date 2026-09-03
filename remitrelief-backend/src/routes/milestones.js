import { Router } from "express";
import {
  fetchOnChainMilestones,
  prepareVerify,
  releaseMilestone,
  verifyMilestone,
} from "../services/milestonesService.js";
import { toErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/:id/prepare-verify", async (req, res) => {
  try {
    const result = await prepareVerify(req.body || {});
    res.json(result);
  } catch (err) {
    logger.error("prepare-verify failed", { reason: err.message });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.post("/:id/verify", async (req, res) => {
  try {
    const result = await verifyMilestone({ id: req.params.id, ...(req.body || {}) });
    res.json(result);
  } catch (err) {
    logger.error("verify failed", { reason: err.message, code: err.code });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

/**
 * Privileged release.
 * Real on-chain release requires header: x-internal-api-key: <INTERNAL_API_KEY>
 * Demo release requires DEMO_MODE=true.
 * Prefer verify with autoRelease=true after a validated verifier signature.
 */
router.post("/:id/release", async (req, res) => {
  try {
    const internalApiKey = req.get("x-internal-api-key") || req.body?.internalApiKey;
    const result = await releaseMilestone({
      id: req.params.id,
      ...(req.body || {}),
      internalApiKey,
    });
    res.json(result);
  } catch (err) {
    logger.error("release failed", { reason: err.message, code: err.code });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.get("/escrow/:escrowAddress", async (req, res) => {
  try {
    const milestones = await fetchOnChainMilestones(req.params.escrowAddress);
    res.json(milestones);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
