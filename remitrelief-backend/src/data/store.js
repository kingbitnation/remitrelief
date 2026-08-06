import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the app filesystem is read-only; persist to /tmp (ephemeral) instead.
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "remitrelief-data")
  : path.join(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const DEMO_ESCROW = process.env.DEMO_ESCROW_CONTRACT_ID || null;

const SEED = {
  campaigns: [
    {
      id: "flood-relief-oaxaca",
      name: "Oaxaca Flood Relief",
      location: "Oaxaca, Mexico",
      description:
        "Emergency shelter, clean water, and food kits for families displaced by flash flooding across the Sierra Madre del Sur.",
      category: "Flood",
      goal: 20000,
      raised: 6420,
      milestonesTotal: 4,
      milestonesVerified: 1,
      escrowAddress: DEMO_ESCROW,
      usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      recipientName: "Cruz Roja Oaxaca",
      imageGradient: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 55%, #0f172a 100%)",
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      milestoneLabels: [
        { index: 0, label: "Emergency kits staged", amount: 4000 },
        { index: 1, label: "Clean water for 200 households", amount: 5000 },
        { index: 2, label: "Temporary shelters erected", amount: 6000 },
        { index: 3, label: "Final food distribution", amount: 5000 },
      ],
    },
    {
      id: "wildfire-relief-california",
      name: "Northern California Wildfire Aid",
      location: "Shasta County, USA",
      description:
        "Rapid-response air filtration, evacuation support, and rebuilding grants for communities hit by seasonal wildfires.",
      category: "Wildfire",
      goal: 35000,
      raised: 12850,
      milestonesTotal: 3,
      milestonesVerified: 0,
      escrowAddress: null,
      usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      recipientName: "Shasta Mutual Aid",
      imageGradient: "linear-gradient(135deg, #f97316 0%, #b91c1c 50%, #1c1917 100%)",
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      milestoneLabels: [
        { index: 0, label: "Evacuation support deployed", amount: 10000 },
        { index: 1, label: "Air filters & PPE delivered", amount: 12000 },
        { index: 2, label: "Rebuilding microgrants issued", amount: 13000 },
      ],
    },
    {
      id: "cyclone-relief-mozambique",
      name: "Mozambique Cyclone Recovery",
      location: "Beira, Mozambique",
      description:
        "Roofing materials, medical supplies, and mobile clinics for coastal communities recovering from cyclone damage.",
      category: "Cyclone",
      goal: 50000,
      raised: 22100,
      milestonesTotal: 4,
      milestonesVerified: 2,
      escrowAddress: null,
      usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      recipientName: "Beira Relief Collective",
      imageGradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 55%, #134e4a 100%)",
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
      milestoneLabels: [
        { index: 0, label: "Medical supplies landed", amount: 10000 },
        { index: 1, label: "Mobile clinic operational", amount: 12000 },
        { index: 2, label: "Roofing kits distributed", amount: 15000 },
        { index: 3, label: "School repairs completed", amount: 13000 },
      ],
    },
    {
      id: "earthquake-relief-turkey",
      name: "Southeast Turkey Quake Support",
      location: "Kahramanmaraş, Turkey",
      description:
        "Temporary housing modules, trauma care kits, and school restart grants for families recovering from seismic damage.",
      category: "Earthquake",
      goal: 80000,
      raised: 31400,
      milestonesTotal: 4,
      milestonesVerified: 1,
      escrowAddress: null,
      usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      recipientName: "Anatolia Relief Network",
      imageGradient: "linear-gradient(135deg, #6366f1 0%, #312e81 55%, #0f172a 100%)",
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      milestoneLabels: [
        { index: 0, label: "Trauma kits distributed", amount: 15000 },
        { index: 1, label: "Housing modules installed", amount: 25000 },
        { index: 2, label: "Water systems restored", amount: 20000 },
        { index: 3, label: "Schools reopened", amount: 20000 },
      ],
    },
  ],
  donations: [
    {
      id: "don-seed-1",
      campaignId: "flood-relief-oaxaca",
      donor: "GDEMOSEED1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: 250,
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      status: "escrowed",
      message: "For the water kits",
    },
    {
      id: "don-seed-2",
      campaignId: "cyclone-relief-mozambique",
      donor: "GDEMOSEED2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: 100,
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      status: "escrowed",
      message: "",
    },
    {
      id: "don-seed-3",
      campaignId: "earthquake-relief-turkey",
      donor: "GDEMOSEED3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: 500,
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      status: "escrowed",
      message: "Stay strong",
    },
  ],
  ledger: [
    {
      id: "led-1",
      type: "donation",
      campaignId: "flood-relief-oaxaca",
      amount: 250,
      actor: "GDEMOSEED1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      note: "Donation escrowed",
    },
    {
      id: "led-2",
      type: "verify",
      campaignId: "flood-relief-oaxaca",
      milestoneIndex: 0,
      actor: "verifier",
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      note: "Milestone 0 verified: Emergency kits staged",
      proofNote: "Photos uploaded by field team — 180 kits staged at warehouse B.",
    },
    {
      id: "led-3",
      type: "release",
      campaignId: "flood-relief-oaxaca",
      amount: 4000,
      milestoneIndex: 0,
      actor: "system",
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      note: "Milestone 0 released to Cruz Roja Oaxaca",
    },
    {
      id: "led-4",
      type: "donation",
      campaignId: "cyclone-relief-mozambique",
      amount: 100,
      actor: "GDEMOSEED2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      note: "Donation escrowed",
    },
    {
      id: "led-5",
      type: "donation",
      campaignId: "earthquake-relief-turkey",
      amount: 500,
      actor: "GDEMOSEED3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      txHash: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      note: "Donation escrowed",
    },
  ],
};

const GRADIENTS = [
  "linear-gradient(135deg, #0ea5e9 0%, #0369a1 55%, #0f172a 100%)",
  "linear-gradient(135deg, #f97316 0%, #b91c1c 50%, #1c1917 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #0f766e 55%, #134e4a 100%)",
  "linear-gradient(135deg, #6366f1 0%, #312e81 55%, #0f172a 100%)",
  "linear-gradient(135deg, #eab308 0%, #a16207 55%, #1c1917 100%)",
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const seed = structuredClone(SEED);
    // Re-apply env escrow on fresh seed
    seed.campaigns[0].escrowAddress = DEMO_ESCROW;
    saveState(seed);
    return seed;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (DEMO_ESCROW) {
      const oaxaca = parsed.campaigns?.find((c) => c.id === "flood-relief-oaxaca");
      if (oaxaca) oaxaca.escrowAddress = DEMO_ESCROW;
    }
    return parsed;
  } catch {
    const seed = structuredClone(SEED);
    seed.campaigns[0].escrowAddress = DEMO_ESCROW;
    saveState(seed);
    return seed;
  }
}

function saveState(state = db) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn("Could not persist store:", err.message);
  }
}

const db = loadState();

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function listCampaigns({ q, category, status } = {}) {
  let rows = db.campaigns.map((c) => ({ ...c }));
  if (status) rows = rows.filter((c) => c.status === status);
  if (category && category !== "All") {
    rows = rows.filter((c) => c.category?.toLowerCase() === category.toLowerCase());
  }
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.location.toLowerCase().includes(needle) ||
        c.description?.toLowerCase().includes(needle) ||
        c.category?.toLowerCase().includes(needle)
    );
  }
  return rows;
}

export function getCampaign(id) {
  const campaign = db.campaigns.find((c) => c.id === id);
  return campaign ? { ...campaign } : null;
}

export function createCampaign(input) {
  const milestones = (input.milestones || [])
    .filter((m) => m.label && Number(m.amount) > 0)
    .map((m, index) => ({
      index,
      label: String(m.label).trim(),
      amount: Number(m.amount),
    }));

  if (!input.name || !input.location || !input.goal) {
    throw new Error("name, location, and goal are required");
  }
  if (!milestones.length) {
    throw new Error("at least one milestone is required");
  }

  let id = slugify(input.name) || uid("campaign");
  if (db.campaigns.some((c) => c.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }

  const campaign = {
    id,
    name: String(input.name).trim(),
    location: String(input.location).trim(),
    description: String(input.description || "").trim(),
    category: String(input.category || "Relief").trim(),
    goal: Number(input.goal),
    raised: 0,
    milestonesTotal: milestones.length,
    milestonesVerified: 0,
    escrowAddress: input.escrowAddress || null,
    usdcIssuer: input.usdcIssuer || "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    recipientName: String(input.recipientName || "Relief partner").trim(),
    imageGradient: input.imageGradient || GRADIENTS[db.campaigns.length % GRADIENTS.length],
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy || null,
    milestoneLabels: milestones,
  };

  db.campaigns.unshift(campaign);
  appendLedger({
    type: "campaign_created",
    campaignId: campaign.id,
    actor: input.createdBy || "organizer",
    note: `Campaign created: ${campaign.name}`,
  });
  saveState();
  return { ...campaign };
}

export function bumpRaised(campaignId, amount) {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;
  campaign.raised = Number(campaign.raised) + Number(amount);
  saveState();
  return { ...campaign };
}

export function setMilestonesVerified(campaignId, count) {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;
  campaign.milestonesVerified = count;
  saveState();
  return { ...campaign };
}

export function recordDonation({
  campaignId,
  donor,
  amount,
  txHash = null,
  status = "escrowed",
  message = "",
}) {
  const entry = {
    id: uid("don"),
    campaignId,
    donor,
    amount: Number(amount),
    txHash,
    createdAt: new Date().toISOString(),
    status,
    message: String(message || "").slice(0, 200),
  };
  db.donations.unshift(entry);
  bumpRaised(campaignId, amount);
  appendLedger({
    type: "donation",
    campaignId,
    amount: Number(amount),
    actor: donor,
    txHash,
    note: message ? `Donation escrowed — “${entry.message}”` : "Donation escrowed",
  });
  return entry;
}

export function listDonations({ donor, campaignId } = {}) {
  return db.donations.filter((d) => {
    if (donor && d.donor !== donor) return false;
    if (campaignId && d.campaignId !== campaignId) return false;
    return true;
  });
}

export function appendLedger(event) {
  const entry = {
    id: uid("led"),
    createdAt: new Date().toISOString(),
    txHash: null,
    ...event,
  };
  db.ledger.unshift(entry);
  saveState();
  return entry;
}

export function listLedger({ campaignId, type, limit = 50 } = {}) {
  let rows = campaignId ? db.ledger.filter((e) => e.campaignId === campaignId) : [...db.ledger];
  if (type) rows = rows.filter((e) => e.type === type);
  return rows.slice(0, limit);
}

export function getStats() {
  const campaigns = db.campaigns;
  const donations = db.donations;
  const released = db.ledger
    .filter((e) => e.type === "release")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    campaignsActive: campaigns.filter((c) => c.status === "active").length,
    totalRaised: campaigns.reduce((sum, c) => sum + Number(c.raised), 0),
    totalGoal: campaigns.reduce((sum, c) => sum + Number(c.goal), 0),
    milestonesVerified: campaigns.reduce((sum, c) => sum + Number(c.milestonesVerified || 0), 0),
    milestonesTotal: campaigns.reduce((sum, c) => sum + Number(c.milestonesTotal || 0), 0),
    donationsCount: donations.length,
    amountReleased: released,
    categories: [...new Set(campaigns.map((c) => c.category).filter(Boolean))],
  };
}

export function resetStore() {
  Object.assign(db, structuredClone(SEED));
  db.campaigns[0].escrowAddress = DEMO_ESCROW;
  saveState();
  return getStats();
}
