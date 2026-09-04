import { Router } from "express";
import { loadConfig } from "../config.js";
import { AppError, ErrorCodes, toErrorResponse } from "../lib/errors.js";
import { ledgerRepo, statsRepo, campaignsRepo } from "../repositories/index.js";
import { requireRole } from "../middleware/auth.js";
import { Roles } from "../auth/roles.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, type, limit } = req.query;
    const events = await ledgerRepo.list({
      campaignId,
      type,
      limit: limit ? Number(limit) : 50,
    });

    const enriched = [];
    for (const event of events) {
      const campaign = event.campaignId ? await campaignsRepo.getById(event.campaignId) : null;
      enriched.push({
        ...event,
        campaignName: campaign?.name || event.campaignId,
        location: campaign?.location,
        eventTrust: event.verifiedOnChain ? "on_chain_verified" : "demo_or_application",
      });
    }
    res.json(enriched);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.get("/stats", async (_req, res) => {
  res.json(await statsRepo.get());
});

/** Development utility — requires ALLOW_STORE_RESET + ADMIN session */
router.post("/reset", requireRole(Roles.ADMIN), async (_req, res) => {
  try {
    const cfg = loadConfig();
    if (!cfg.allowStoreReset) {
      throw new AppError(ErrorCodes.FORBIDDEN, "reset disabled");
    }
    res.json(await statsRepo.reset());
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
