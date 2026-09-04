import { loadConfig } from "../config.js";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { campaignsRepo, statsRepo, usersRepo } from "../repositories/index.js";
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

export async function listCampaigns(filters) {
  return campaignsRepo.list(filters);
}

export async function getStats() {
  return statsRepo.get();
}

/**
 * Any authenticated wallet may create a campaign; first create promotes donor → organizer.
 */
export async function createCampaign(input, { publicKey } = {}) {
  try {
    const createdBy = publicKey || input.createdBy || null;
    const campaign = await campaignsRepo.create({ ...input, createdBy });
    if (publicKey) {
      await usersRepo.addRole(publicKey, "NGO");
    }
    return campaign;
  } catch (err) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, err.message || "could not create campaign");
  }
}

export async function getCampaignDetail(id) {
  const campaign = await campaignsRepo.getById(id);
  if (!campaign) {
    throw new AppError(ErrorCodes.CAMPAIGN_NOT_FOUND, "campaign not found");
  }

  if (!campaign.escrowAddress) {
    return enrichFromChain(campaign, null, null);
  }

  if (!loadConfig().secrets.backendSignerSecret) {
    logger.warn("Skipping on-chain enrich — BACKEND_SIGNER_SECRET unset", { id });
    return enrichFromChain(campaign, null, null);
  }

  try {
    const [onChainBalance, milestones] = await Promise.all([
      getEscrowBalance(campaign.escrowAddress),
      getMilestones(campaign.escrowAddress),
    ]);
    const enriched = enrichFromChain(campaign, onChainBalance, milestones);
    if (Array.isArray(milestones) && milestones.length) {
      await campaignsRepo.setMilestonesVerified(campaign.id, enriched.milestonesVerified);
    }
    return enriched;
  } catch (err) {
    logger.warn("Could not read on-chain state", { id, reason: err.message });
    return enrichFromChain(campaign, null, null);
  }
}
