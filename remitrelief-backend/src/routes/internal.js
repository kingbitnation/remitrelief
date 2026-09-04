import { Router } from "express";
import { requireInternalApiKey } from "../config.js";
import { runIndexer, indexerStatus } from "../services/indexerService.js";
import { toErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const router = Router();

function assertInternal(req) {
  const key = req.get("x-internal-api-key") || req.body?.internalApiKey;
  try {
    requireInternalApiKey(key);
    return;
  } catch {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
    const cronSecret = process.env.CRON_SECRET;
    const auth = req.get("authorization") || "";
    if (cronSecret && auth === `Bearer ${cronSecret}`) return;
    requireInternalApiKey(key);
  }
}

router.get("/indexer/status", async (req, res) => {
  try {
    assertInternal(req);
    res.json(await indexerStatus());
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.get("/indexer/run", async (req, res) => {
  try {
    assertInternal(req);
    logger.info("Indexer run requested (GET/cron)");
    const summary = await runIndexer({
      limitPerContract: Number(req.query?.limitPerContract) || 50,
    });
    res.json({ ok: true, summary });
  } catch (err) {
    logger.error("Indexer run failed", { reason: err.message });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

router.post("/indexer/run", async (req, res) => {
  try {
    assertInternal(req);
    logger.info("Indexer run requested");
    const summary = await runIndexer({
      limitPerContract: Number(req.body?.limitPerContract) || 50,
    });
    res.json({ ok: true, summary });
  } catch (err) {
    logger.error("Indexer run failed", { reason: err.message });
    const { status, body } = toErrorResponse(err);
    res.status(status).json(body);
  }
});

export default router;
