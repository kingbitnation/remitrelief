import { Router } from "express";
import { listLedger, getCampaign, getStats, resetStore } from "../data/store.js";

const router = Router();

router.get("/", (req, res) => {
  const { campaignId, type, limit } = req.query;
  const events = listLedger({
    campaignId,
    type,
    limit: limit ? Number(limit) : 50,
  }).map((event) => {
    const campaign = getCampaign(event.campaignId);
    return {
      ...event,
      campaignName: campaign?.name || event.campaignId,
      location: campaign?.location,
    };
  });
  res.json(events);
});

router.get("/stats", (_req, res) => {
  res.json(getStats());
});

// Dev helper — only available when explicitly enabled
router.post("/reset", (_req, res) => {
  if (process.env.ALLOW_STORE_RESET !== "true") {
    return res.status(403).json({ error: "reset disabled" });
  }
  res.json(resetStore());
});

export default router;
