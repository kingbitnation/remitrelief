import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { loadConfig, publicConfig } from "./config.js";
import { errorMiddleware } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import campaignsRouter from "./routes/campaigns.js";
import milestonesRouter from "./routes/milestones.js";
import donationsRouter from "./routes/donations.js";
import ledgerRouter from "./routes/ledger.js";
import authRouter from "./routes/auth.js";
import internalRouter from "./routes/internal.js";
import { getStats } from "./services/campaignsService.js";

loadConfig();

const app = express();
const cfg = loadConfig();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const allowlist = new Set(cfg.corsOrigins);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowlist.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/campaigns", campaignsRouter);
app.use("/milestones", milestonesRouter);
app.use("/donations", donationsRouter);
app.use("/ledger", ledgerRouter);
app.use("/internal", internalRouter);

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "remitrelief-api",
    time: new Date().toISOString(),
    config: publicConfig(),
  })
);

app.get("/stats", async (_req, res) => res.json(await getStats()));

app.use(errorMiddleware);

export default app;

if (!process.env.VERCEL) {
  const PORT = cfg.port;
  app.listen(PORT, () => {
    logger.info(`RemitRelief API listening`, {
      port: PORT,
      demoMode: cfg.demoMode,
      network: cfg.stellar.network,
      storeDriver: cfg.storeDriver,
      authMode: "wallet_session",
    });
  });
}
