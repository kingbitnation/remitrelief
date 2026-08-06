import { Router } from "express";
import {
  verifyMilestoneOnChain,
  releaseMilestoneFunds,
  getMilestones,
  buildVerifyMilestoneXdr,
} from "../services/soroban.js";
import { appendLedger, getCampaign, setMilestonesVerified } from "../data/store.js";

const router = Router();

/**
 * Build an unsigned verify_milestone XDR for the NGO wallet to sign.
 */
router.post("/:id/prepare-verify", async (req, res) => {
  const { escrowAddress, milestoneIndex, verifierPublicKey } = req.body;
  if (!escrowAddress || milestoneIndex === undefined || !verifierPublicKey) {
    return res.status(400).json({ error: "missing required fields" });
  }

  try {
    const { unsignedXdr } = await buildVerifyMilestoneXdr({
      escrowAddress,
      milestoneIndex,
      verifierPublicKey,
    });
    res.json({ unsignedXdr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "could not prepare verify tx" });
  }
});

/**
 * Step 1: relief-partner NGO confirms a milestone. Relays signed XDR to network.
 */
router.post("/:id/verify", async (req, res) => {
  const { id } = req.params;
  const {
    escrowAddress,
    milestoneIndex,
    verifierPublicKey,
    verifierSignedXDR,
    campaignId,
    proofNote = "",
    demo = false,
  } = req.body;

  if (demo || !escrowAddress) {
    const campaign = getCampaign(campaignId || id);
    const label = campaign?.milestoneLabels?.[Number(milestoneIndex)]?.label;
    if (campaign) {
      const next = Math.min(
        Number(campaign.milestonesTotal),
        Math.max(Number(campaign.milestonesVerified), Number(milestoneIndex) + 1)
      );
      setMilestonesVerified(campaign.id, next);
    }
    const event = appendLedger({
      type: "verify",
      campaignId: campaignId || id,
      milestoneIndex: Number(milestoneIndex),
      actor: verifierPublicKey || "demo-verifier",
      note: label
        ? `Milestone ${milestoneIndex} verified: ${label}`
        : `Milestone ${milestoneIndex} verified (demo)`,
      proofNote: String(proofNote || "").slice(0, 500) || undefined,
    });
    return res.json({ milestoneId: id, verified: true, demo: true, event });
  }

  if (milestoneIndex === undefined || !verifierSignedXDR) {
    return res.status(400).json({ error: "missing required fields" });
  }

  try {
    const result = await verifyMilestoneOnChain({
      escrowAddress,
      milestoneIndex,
      verifierPublicKey,
      verifierSignedXDR,
    });
    appendLedger({
      type: "verify",
      campaignId: campaignId || id,
      milestoneIndex: Number(milestoneIndex),
      actor: verifierPublicKey,
      txHash: result.hash,
      note: `Milestone ${milestoneIndex} verified on-chain`,
      proofNote: String(proofNote || "").slice(0, 500) || undefined,
    });
    res.json({ milestoneId: id, verified: true, txHash: result.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "verification failed" });
  }
});

/**
 * Step 2: releases that milestone's tranche once verified on-chain.
 */
router.post("/:id/release", async (req, res) => {
  const { id } = req.params;
  const { escrowAddress, milestoneIndex, campaignId, demo = false, amount } = req.body;

  if (demo || !escrowAddress) {
    const event = appendLedger({
      type: "release",
      campaignId: campaignId || id,
      milestoneIndex: Number(milestoneIndex),
      amount: amount != null ? Number(amount) : undefined,
      actor: "system",
      note: `Milestone ${milestoneIndex} released (demo)`,
    });
    return res.json({ milestoneId: id, released: true, demo: true, event });
  }

  if (milestoneIndex === undefined) {
    return res.status(400).json({ error: "missing required fields" });
  }

  try {
    const result = await releaseMilestoneFunds({ escrowAddress, milestoneIndex });
    appendLedger({
      type: "release",
      campaignId: campaignId || id,
      milestoneIndex: Number(milestoneIndex),
      amount: amount != null ? Number(amount) : undefined,
      actor: "system",
      txHash: result.hash,
      note: `Milestone ${milestoneIndex} released on-chain`,
    });
    res.json({ milestoneId: id, released: true, txHash: result.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "release failed" });
  }
});

router.get("/escrow/:escrowAddress", async (req, res) => {
  try {
    const milestones = await getMilestones(req.params.escrowAddress);
    res.json(milestones);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "could not fetch milestones" });
  }
});

export default router;
