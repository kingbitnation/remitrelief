import { Router } from "express";
import {
  listDonations,
  prepareDonation,
  recordVerifiedDonation,
} from "../services/donationsService.js";
import { toErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const router = Router();

/** Public: prepare unsigned deposit XDR */
router.post("/prepare", async (req, res) => {
  try {
    const result = await prepareDonation(req.body || {});
    res.json(result);
  } catch (err) {
    logger.error("prepare donation failed", { reason: err.message });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

/**
 * Record donation — verified on-chain, or demo-only when DEMO_MODE=true.
 * Rejects forgeable client-only financial claims in production.
 */
router.post("/", async (req, res) => {
  try {
    const entry = await recordVerifiedDonation(req.body || {});
    res.status(201).json(entry);
  } catch (err) {
    logger.error("record donation failed", { reason: err.message, code: err.code });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

/** Public: donation history filters */
router.get("/", (req, res) => {
  const { donor, campaignId } = req.query;
  res.json(listDonations({ donor, campaignId }));
});

export default router;
