import { loadConfig } from "../config.js";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { campaignsRepo, statsRepo } from "../repositories/index.js";
import { getEscrowBalance, getMilestones } from "../blockchain/soroban/index.js";

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
    campaignsRepo.setMilestonesVerified(campaign.id, enriched.milestonesVerified);
  } else if (campaign.milestoneLabels?.length) {
    enriched.milestones = campaign.milestoneLabels.map((m) => ({
      index: m.index,
      amount: m.amount * 1e7,
      amountUsd: m.amount,
      verified: m.index < campaign.milestonesVerified,
      released: false,
      label: m.label,
    }));
  }
  return enriched;
}

export function listCampaigns(filters) {
  return campaignsRepo.list(filters);
}

export function getStats() {
  return statsRepo.get();
}

export function createCampaign(input) {
  try {
    return campaignsRepo.create(input);
  } catch (err) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, err.message || "could not create campaign");
  }
}

export async function getCampaignDetail(id) {
  const campaign = campaignsRepo.getById(id);
  if (!campaign) {
    throw new AppError(ErrorCodes.CAMPAIGN_NOT_FOUND, "campaign not found");
  }

  if (!campaign.escrowAddress) {
    return enrichFromChain(campaign, null, null);
  }

  // Chain reads need a backend signer for fee/source account simulation
  if (!loadConfig().secrets.backendSignerSecret) {
    logger.warn("Skipping on-chain enrich — BACKEND_SIGNER_SECRET unset", { id });
    return enrichFromChain(campaign, null, null);
  }

  try {
    const [onChainBalance, milestones] = await Promise.all([
      getEscrowBalance(campaign.escrowAddress),
      getMilestones(campaign.escrowAddress),
    ]);
    return enrichFromChain(campaign, onChainBalance, milestones);
  } catch (err) {
    logger.warn("Could not read on-chain state", { id, reason: err.message });
    return enrichFromChain(campaign, null, null);
  }
}
