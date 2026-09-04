import { Router } from "express";
import { createCampaign, getCampaignDetail, getStats, listCampaigns } from "../services/campaignsService.js";
import { requireAuth } from "../middleware/auth.js";
import { toErrorResponse } from "../lib/errors.js";

const router = Router();

router.get("/", async (req, res) => {
  const { q, category, status } = req.query;
  res.json(await listCampaigns({ q, category, status }));
});

router.get("/meta/stats", async (_req, res) => {
  res.json(await getStats());
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const campaign = await createCampaign(req.body || {}, {
      publicKey: req.user.walletAddress,
    });
    res.status(201).json(campaign);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const campaign = await getCampaignDetail(req.params.id);
    res.json(campaign);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
