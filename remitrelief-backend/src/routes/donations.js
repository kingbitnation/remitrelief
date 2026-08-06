import { Router } from "express";
import { recordDonation, listDonations, getCampaign } from "../data/store.js";
import { buildDepositXdr } from "../services/soroban.js";

const router = Router();

/**
 * Prepare an unsigned Soroban deposit() transaction for the donor to sign.
 */
router.post("/prepare", async (req, res) => {
  const { escrowAddress, donorPublicKey, amount } = req.body;
  if (!escrowAddress || !donorPublicKey || !amount) {
    return res.status(400).json({ error: "missing required fields" });
  }

  try {
    const amountStroops = Math.round(Number(amount) * 1e7);
    const { unsignedXdr } = await buildDepositXdr({
      escrowAddress,
      donorPublicKey,
      amountStroops,
    });
    res.json({ unsignedXdr, amountStroops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "could not prepare deposit" });
  }
});

/**
 * Record a completed donation (on-chain or demo) for dashboards + ledger.
 */
router.post("/", (req, res) => {
  const { campaignId, donor, amount, txHash, status, message } = req.body;
  if (!campaignId || !donor || !amount) {
    return res.status(400).json({ error: "missing required fields" });
  }
  if (!getCampaign(campaignId)) {
    return res.status(404).json({ error: "campaign not found" });
  }

  const entry = recordDonation({
    campaignId,
    donor,
    amount: Number(amount),
    txHash: txHash || null,
    status: status || "escrowed",
    message: message || "",
  });
  res.status(201).json(entry);
});

router.get("/", (req, res) => {
  const { donor, campaignId } = req.query;
  res.json(listDonations({ donor, campaignId }));
});

export default router;
