import { Router } from "express";
import { getEscrowBalance, getMilestones } from "../services/soroban.js";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  setMilestonesVerified,
  getStats,
} from "../data/store.js";

const router = Router();

function enrichFromChain(campaign, onChainBalance, milestones) {
  const enriched = { ...campaign };
  if (onChainBalance != null) {
    enriched.onChainBalance = onChainBalance;
    enriched.onChainBalanceUsd = Number(onChainBalance) / 1e7;
  }
  if (Array.isArray(milestones) && milestones.length) {
    enriched.milestones = milestones.map((m, index) => ({
      index,
      amount: m.amount,
      amountUsd: Number(m.amount) / 1e7,
      verified: Boolean(m.verified),
      released: Boolean(m.released),
      label: campaign.milestoneLabels?.[index]?.label || `Milestone ${index + 1}`,
    }));
    enriched.milestonesVerified = milestones.filter((m) => m.verified).length;
    enriched.milestonesTotal = milestones.length;
    setMilestonesVerified(campaign.id, enriched.milestonesVerified);
  } else if (campaign.milestoneLabels?.length) {
    enriched.milestones = campaign.milestoneLabels.map((m) => ({
      index: m.index,
      amount: m.amount * 1e7,
      amountUsd: m.amount,
      verified: m.index < campaign.milestonesVerified,
      released: m.index < campaign.milestonesVerified,
      label: m.label,
    }));
  }
  return enriched;
}

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
    res.status(400).json({ error: err.message || "could not create campaign" });
  }
});

router.get("/:id", async (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: "not found" });

  if (!campaign.escrowAddress) {
    return res.json(enrichFromChain(campaign, null, null));
  }

  try {
    const [onChainBalance, milestones] = await Promise.all([
      getEscrowBalance(campaign.escrowAddress),
      getMilestones(campaign.escrowAddress),
    ]);
    res.json(enrichFromChain(campaign, onChainBalance, milestones));
  } catch (err) {
    console.warn(`Could not read on-chain state for ${campaign.id}:`, err.message);
    res.json(enrichFromChain(campaign, null, null));
  }
});

export default router;
