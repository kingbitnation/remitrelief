import "dotenv/config";
import express from "express";
import cors from "cors";
import campaignsRouter from "./routes/campaigns.js";
import milestonesRouter from "./routes/milestones.js";
import donationsRouter from "./routes/donations.js";
import ledgerRouter from "./routes/ledger.js";
import { getStats } from "./data/store.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/campaigns", campaignsRouter);
app.use("/milestones", milestonesRouter);
app.use("/donations", donationsRouter);
app.use("/ledger", ledgerRouter);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "remitrelief-api", time: new Date().toISOString() })
);

app.get("/stats", (_req, res) => res.json(getStats()));

export default app;

// Local / traditional hosting only — Vercel imports the app as a serverless handler.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`RemitRelief API listening on :${PORT}`));
}
