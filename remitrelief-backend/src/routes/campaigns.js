import { Router } from "express";
import { createCampaign, getCampaignDetail, getStats, listCampaigns } from "../services/campaignsService.js";
import { toErrorResponse } from "../lib/errors.js";

const router = Router();

router.get("/", async (req, res) => {
  const { q, category, status } = req.query;
  res.json(listCampaigns({ q, category, status }));
});

router.get("/meta/stats", (_req, res) => {
  res.json(getStats());
});

router.post("/", (req, res) => {
  try {
    const campaign = createCampaign(req.body || {});
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
