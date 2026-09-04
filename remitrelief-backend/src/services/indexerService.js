import { logger } from "../lib/logger.js";
import { campaignsRepo, ledgerRepo, indexerRepo } from "../repositories/index.js";
import { fetchEscrowEvents } from "../blockchain/soroban/events.js";
import { getSorobanServer } from "../blockchain/soroban/client.js";

/**
 * Poll Soroban events for campaigns with escrow addresses and append ledger rows.
 * Idempotent on (txHash, type, campaignId).
 */
export async function runIndexer({ limitPerContract = 50 } = {}) {
  const campaigns = (await campaignsRepo.list({})).filter((c) => c.escrowAddress);
  const summary = {
    campaigns: campaigns.length,
    scanned: 0,
    appended: 0,
    duplicates: 0,
    errors: [],
  };

  let latestNetworkLedger = null;
  try {
    const server = getSorobanServer();
    if (typeof server.getLatestLedger === "function") {
      const latest = await server.getLatestLedger();
      latestNetworkLedger = latest?.sequence ?? latest?.ledger ?? null;
    }
  } catch (err) {
    logger.debug("Could not read latest ledger", { reason: err.message });
  }

  for (const campaign of campaigns) {
    const cursorKey = `escrow:${campaign.escrowAddress}`;
    try {
      const storedCursor = await indexerRepo.getCursor(cursorKey);
      const startLedger =
        !storedCursor && latestNetworkLedger
          ? Math.max(1, Number(latestNetworkLedger) - 10_000)
          : undefined;

      const { events, cursor } = await fetchEscrowEvents({
        contractId: campaign.escrowAddress,
        cursor: storedCursor || undefined,
        startLedger,
        limit: limitPerContract,
      });

      summary.scanned += events.length;

      for (const ev of events) {
        if (!ev.txHash || ev.type === "init") continue;

        const note =
          ev.type === "donation"
            ? "Donation escrowed (indexed from chain)"
            : ev.type === "verify"
              ? "Milestone verified (indexed from chain)"
              : "Milestone released (indexed from chain)";

        const entry = await ledgerRepo.append({
          type: ev.type,
          campaignId: campaign.id,
          actor: "indexer",
          txHash: ev.txHash,
          note,
          verifiedOnChain: true,
          source: "on_chain",
        });

        if (entry._duplicate) summary.duplicates += 1;
        else summary.appended += 1;
      }

      if (cursor) {
        await indexerRepo.setCursor(cursorKey, String(cursor));
      } else if (!storedCursor && latestNetworkLedger) {
        await indexerRepo.setCursor(cursorKey, String(latestNetworkLedger));
      }
    } catch (err) {
      summary.errors.push({ campaignId: campaign.id, reason: err.message });
      logger.warn("Indexer campaign failed", {
        campaignId: campaign.id,
        reason: err.message,
      });
    }
  }

  return summary;
}

export async function indexerStatus() {
  const campaigns = (await campaignsRepo.list({})).filter((c) => c.escrowAddress);
  const cursors = [];
  for (const c of campaigns) {
    const key = `escrow:${c.escrowAddress}`;
    cursors.push({
      campaignId: c.id,
      escrowAddress: c.escrowAddress,
      cursor: await indexerRepo.getCursor(key),
    });
  }
  return { escrowCampaigns: campaigns.length, cursors };
}
