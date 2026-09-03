import { Router } from "express";
import { loadConfig } from "../config.js";
import { AppError, ErrorCodes, toErrorResponse } from "../lib/errors.js";
import { ledgerRepo, statsRepo, campaignsRepo } from "../repositories/index.js";

const router = Router();

router.get("/", (req, res) => {
  const { campaignId, type, limit } = req.query;
  const events = ledgerRepo
    .list({
      campaignId,
      type,
      limit: limit ? Number(limit) : 50,
    })
    .map((event) => {
      const campaign = campaignsRepo.getById(event.campaignId);
      return {
        ...event,
        campaignName: campaign?.name || event.campaignId,
        location: campaign?.location,
        // Explicit transparency flags for UI
        eventTrust: event.verifiedOnChain ? "on_chain_verified" : "demo_or_application",
      };
    });
  res.json(events);
});

router.get("/stats", (_req, res) => {
  res.json(statsRepo.get());
});

router.post("/reset", (_req, res) => {
  try {
    const cfg = loadConfig();
    if (!cfg.allowStoreReset) {
      throw new AppError(ErrorCodes.FORBIDDEN, "reset disabled");
    }
    res.json(statsRepo.reset());
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
