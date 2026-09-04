import { Router } from "express";
import {
  fetchOnChainMilestones,
  prepareVerify,
  releaseMilestone,
  verifyMilestone,
} from "../services/milestonesService.js";
import { requireOperatorOrInternalKey, requireRole } from "../middleware/auth.js";
import { Roles } from "../auth/roles.js";
import { toErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post(
  "/:id/prepare-verify",
  requireRole(Roles.NGO, Roles.ADMIN),
  async (req, res) => {
    try {
      const body = req.body || {};
      const result = await prepareVerify({
        escrowAddress: body.escrowAddress,
        milestoneIndex: body.milestoneIndex,
        verifierPublicKey: req.user.walletAddress,
      });
      res.json(result);
    } catch (err) {
      logger.error("prepare-verify failed", { reason: err.message });
      const { status, body } = toErrorResponse(err);
      res.status(status).json(body);
    }
  }
);

router.post("/:id/verify", requireRole(Roles.NGO, Roles.ADMIN), async (req, res) => {
  try {
    const body = req.body || {};
    const result = await verifyMilestone({
      id: req.params.id,
      escrowAddress: body.escrowAddress,
      milestoneIndex: body.milestoneIndex,
      verifierSignedXDR: body.verifierSignedXDR,
      campaignId: body.campaignId,
      proofNote: body.proofNote,
      demo: body.demo,
      autoRelease: body.autoRelease,
      verifierPublicKey: req.user.walletAddress,
    });
    res.json(result);
  } catch (err) {
    logger.error("verify failed", { reason: err.message, code: err.code });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.post("/:id/release", requireOperatorOrInternalKey, async (req, res) => {
  try {
    const internalApiKey = req.get("x-internal-api-key") || req.body?.internalApiKey;
    const result = await releaseMilestone({
      id: req.params.id,
      escrowAddress: req.body?.escrowAddress,
      milestoneIndex: req.body?.milestoneIndex,
      campaignId: req.body?.campaignId,
      amount: req.body?.amount,
      demo: req.body?.demo,
      internalApiKey,
      internalAuthorized: Boolean(req.internalAuthorized),
      operatorAuthorized: Boolean(req.operatorAuthorized),
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
