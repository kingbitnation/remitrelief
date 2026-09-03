import "dotenv/config";
import express from "express";
import cors from "cors";
import { loadConfig, publicConfig } from "./config.js";
import { errorMiddleware } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import campaignsRouter from "./routes/campaigns.js";
import milestonesRouter from "./routes/milestones.js";
import donationsRouter from "./routes/donations.js";
import ledgerRouter from "./routes/ledger.js";
import { getStats } from "./services/campaignsService.js";

// Fail fast on unsupported network / mainnet
loadConfig();

const app = express();

const cfg = loadConfig();
app.use(
  cors({
    origin: cfg.isProduction ? true : true, // Phase 3: tighten allowlist
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/campaigns", campaignsRouter);
app.use("/milestones", milestonesRouter);
app.use("/donations", donationsRouter);
app.use("/ledger", ledgerRouter);

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "remitrelief-api",
    time: new Date().toISOString(),
    config: publicConfig(),
  })
);

app.get("/stats", (_req, res) => res.json(getStats()));

app.use(errorMiddleware);

export default app;

if (!process.env.VERCEL) {
  const PORT = cfg.port;
  app.listen(PORT, () => {
    logger.info(`RemitRelief API listening`, {
      port: PORT,
      demoMode: cfg.demoMode,
      network: cfg.stellar.network,
    });
  });
}
