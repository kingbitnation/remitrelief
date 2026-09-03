import { assertDemoModeAllowed, requireInternalApiKey } from "../config.js";
import { AppError, ErrorCodes } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { campaignsRepo, ledgerRepo } from "../repositories/index.js";
import {
  buildVerifyMilestoneXdr,
  releaseMilestoneFunds,
  getMilestones,
  submitSignedXdr,
  verifyMilestoneVerificationTransaction,
} from "../blockchain/soroban/index.js";

export async function prepareVerify({ escrowAddress, milestoneIndex, verifierPublicKey }) {
  if (!escrowAddress || milestoneIndex === undefined || !verifierPublicKey) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, "missing required fields");
  }
  const { unsignedXdr } = await buildVerifyMilestoneXdr({
    escrowAddress,
    milestoneIndex,
    verifierPublicKey,
  });
  return { unsignedXdr };
}

export async function verifyMilestone({
  id,
  escrowAddress,
  milestoneIndex,
  verifierPublicKey,
  verifierSignedXDR,
  campaignId,
  proofNote = "",
  demo = false,
  autoRelease = true,
}) {
  const cid = campaignId || id;
  const campaign = campaignsRepo.getById(cid);
  const wantsDemo = Boolean(demo) || !escrowAddress;

  if (wantsDemo) {
    assertDemoModeAllowed();
    const label = campaign?.milestoneLabels?.[Number(milestoneIndex)]?.label;
    if (campaign) {
      const next = Math.min(
        Number(campaign.milestonesTotal),
        Math.max(Number(campaign.milestonesVerified), Number(milestoneIndex) + 1)
      );
      campaignsRepo.setMilestonesVerified(campaign.id, next);
    }
    const event = ledgerRepo.append({
      type: "verify",
      campaignId: cid,
      milestoneIndex: Number(milestoneIndex),
      actor: verifierPublicKey || "demo-verifier",
      note: label
        ? `Milestone ${milestoneIndex} verified: ${label}`
        : `Milestone ${milestoneIndex} verified (demo)`,
      proofNote: String(proofNote || "").slice(0, 500) || undefined,
      verifiedOnChain: false,
      source: "demo",
    });

    let releaseEvent = null;
    if (autoRelease) {
      releaseEvent = await releaseMilestone({
        id,
        campaignId: cid,
        milestoneIndex,
        amount: campaign?.milestoneLabels?.[Number(milestoneIndex)]?.amount,
        demo: true,
      });
    }

    return { milestoneId: id, verified: true, demo: true, event, release: releaseEvent };
  }

  if (milestoneIndex === undefined || !verifierSignedXDR || !verifierPublicKey) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, "missing required fields for on-chain verify");
  }

  // Validate XDR content before submitting
  verifyMilestoneVerificationTransaction({
    signedXdr: verifierSignedXDR,
    escrowAddress,
    milestoneIndex: Number(milestoneIndex),
    verifierPublicKey,
  });

  logger.info("Submitting verified milestone XDR", {
    escrowAddress,
    milestoneIndex,
    verifierPublicKey,
  });

  const result = await submitSignedXdr(verifierSignedXDR);

  if (campaign) {
    const next = Math.min(
      Number(campaign.milestonesTotal),
      Math.max(Number(campaign.milestonesVerified), Number(milestoneIndex) + 1)
    );
    campaignsRepo.setMilestonesVerified(campaign.id, next);
  }

  const event = ledgerRepo.append({
    type: "verify",
    campaignId: cid,
    milestoneIndex: Number(milestoneIndex),
    actor: verifierPublicKey,
    txHash: result.hash,
    note: `Milestone ${milestoneIndex} verified on-chain`,
    proofNote: String(proofNote || "").slice(0, 500) || undefined,
    verifiedOnChain: true,
    source: "on_chain",
  });

  let releaseResult = null;
  if (autoRelease) {
    // After a validated verifier signature, backend may release without separate public call.
    releaseResult = await releaseMilestone({
      id,
      escrowAddress,
      milestoneIndex,
      campaignId: cid,
      amount: campaign?.milestoneLabels?.[Number(milestoneIndex)]?.amount,
      internalAuthorized: true,
    });
  }

  return {
    milestoneId: id,
    verified: true,
    txHash: result.hash,
    event,
    release: releaseResult,
  };
}

/**
 * Privileged release.
 * - demo: DEMO_MODE only
 * - real: requires internalAuthorized (from verified auto-release) OR INTERNAL_API_KEY
 */
export async function releaseMilestone({
  id,
  escrowAddress,
  milestoneIndex,
  campaignId,
  demo = false,
  amount,
  internalApiKey,
  internalAuthorized = false,
}) {
  const cid = campaignId || id;
  const wantsDemo = Boolean(demo) || !escrowAddress;

  if (wantsDemo) {
    assertDemoModeAllowed();
    const event = ledgerRepo.append({
      type: "release",
      campaignId: cid,
      milestoneIndex: Number(milestoneIndex),
      amount: amount != null ? Number(amount) : undefined,
      actor: "system",
      note: `Milestone ${milestoneIndex} released (demo)`,
      verifiedOnChain: false,
      source: "demo",
    });
    return { milestoneId: id, released: true, demo: true, event };
  }

  if (milestoneIndex === undefined || !escrowAddress) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, "missing required fields");
  }

  if (!internalAuthorized) {
    requireInternalApiKey(internalApiKey);
  }

  logger.info("Releasing milestone funds", { escrowAddress, milestoneIndex });
  const result = await releaseMilestoneFunds({
    escrowAddress,
    milestoneIndex: Number(milestoneIndex),
  });

  const event = ledgerRepo.append({
    type: "release",
    campaignId: cid,
    milestoneIndex: Number(milestoneIndex),
    amount: amount != null ? Number(amount) : undefined,
    actor: "system",
    txHash: result.hash,
    note: `Milestone ${milestoneIndex} released on-chain`,
    verifiedOnChain: true,
    source: "on_chain",
  });

  return { milestoneId: id, released: true, txHash: result.hash, event };
}

export async function fetchOnChainMilestones(escrowAddress) {
  return getMilestones(escrowAddress);
}
