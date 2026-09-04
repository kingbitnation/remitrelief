import { getSorobanServer } from "./client.js";
import { logger } from "../../lib/logger.js";

/**
 * Fetch recent contract events for an escrow address.
 * Returns normalized [{ type, txHash, topics, value, ledger }]
 */
export async function fetchEscrowEvents({ contractId, startLedger, cursor, limit = 100 } = {}) {
  if (!contractId) return { events: [], latestLedger: null, cursor: null };

  const server = getSorobanServer();
  const filters = [
    {
      type: "contract",
      contractIds: [contractId],
    },
  ];

  const request = {
    filters,
    pagination: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  };

  if (!cursor && startLedger) {
    request.startLedger = startLedger;
  }

  try {
    const page = await server.getEvents(request);
    const events = (page.events || []).map((ev) => normalizeEvent(ev)).filter(Boolean);
    return {
      events,
      latestLedger: page.latestLedger ?? null,
      cursor: page.cursor || page.pagingToken || null,
    };
  } catch (err) {
    logger.warn("getEvents failed", { contractId, reason: err.message });
    throw err;
  }
}

function topicToString(topic) {
  try {
    if (topic == null) return "";
    if (typeof topic === "string") return topic;
    if (typeof topic.sym === "function") return topic.sym().toString();
    if (typeof topic.toString === "function") {
      const s = topic.toString();
      if (s && s !== "[object Object]") return s;
    }
    if (topic._value != null) return String(topic._value);
    return String(topic);
  } catch {
    return "";
  }
}

function normalizeEvent(ev) {
  const topics = (ev.topic || ev.topics || []).map(topicToString);
  const typeHint = topics[0] || "";
  let type = null;
  if (typeHint.includes("deposit")) type = "donation";
  else if (typeHint.includes("verify")) type = "verify";
  else if (typeHint.includes("release")) type = "release";
  else if (typeHint.includes("init")) type = "init";
  else return null;

  return {
    type,
    txHash: ev.txHash || ev.transactionHash || null,
    topics,
    ledger: ev.ledger || ev.ledgerCloseTime || null,
    contractId: ev.contractId || null,
    raw: ev,
  };
}
