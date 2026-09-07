/**
 * Prisma-backed repositories — Phase 3 primary persistence.
 */

import { getPrisma } from "../../database/prisma.js";
import { hashSessionToken } from "../../auth/sessionToken.js";
import { Roles, normalizeRoles } from "../../auth/roles.js";

function parseKeys(...envNames) {
  const set = new Set();
  for (const name of envNames) {
    for (const part of String(process.env[name] || "").split(",")) {
      const t = part.trim();
      if (t) set.add(t);
    }
  }
  return set;
}

function seedRolesFor(walletAddress) {
  const roles = new Set([Roles.DONOR]);
  const admins = parseKeys("ADMIN_PUBLIC_KEYS", "OPERATOR_PUBLIC_KEYS");
  const ngos = parseKeys("NGO_PUBLIC_KEYS", "VERIFIER_PUBLIC_KEYS");
  const recipients = parseKeys("RECIPIENT_PUBLIC_KEYS");
  if (admins.has(walletAddress)) roles.add(Roles.ADMIN);
  if (ngos.has(walletAddress)) roles.add(Roles.NGO);
  if (recipients.has(walletAddress)) roles.add(Roles.RECIPIENT);
  const demo =
    process.env.NODE_ENV !== "production" &&
    (process.env.DEMO_MODE == null ||
      ["1", "true", "yes", "on"].includes(String(process.env.DEMO_MODE).toLowerCase()));
  if (demo && ngos.size === 0) roles.add(Roles.NGO);
  return normalizeRoles([...roles]);
}

function primaryRole(roles) {
  const r = normalizeRoles(roles);
  if (r.includes(Roles.ADMIN)) return Roles.ADMIN;
  if (r.includes(Roles.NGO)) return Roles.NGO;
  if (r.includes(Roles.RECIPIENT)) return Roles.RECIPIENT;
  return Roles.DONOR;
}

function mapUser(u) {
  if (!u) return null;
  const roles = normalizeRoles(u.roles || [u.role]);
  return {
    id: u.id,
    publicKey: u.walletAddress,
    walletAddress: u.walletAddress,
    roles,
    role: u.role || primaryRole(roles),
    status: u.status || "ACTIVE",
    createdAt: u.createdAt?.toISOString?.() || u.createdAt,
    updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
    lastLoginAt: u.lastLoginAt?.toISOString?.() || u.lastLoginAt,
  };
}

function mapCampaign(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    location: c.location,
    description: c.description,
    category: c.category,
    goal: Number(c.goal),
    raised: Number(c.raised),
    milestonesTotal: c.milestonesTotal,
    milestonesVerified: c.milestonesVerified,
    escrowAddress: c.escrowAddress,
    usdcIssuer: c.usdcIssuer,
    recipientName: c.recipientName,
    imageGradient: c.imageGradient,
    status: c.status,
    createdAt: c.createdAt?.toISOString?.() || c.createdAt,
    createdBy: c.createdByWallet,
    milestoneLabels: c.milestoneLabels || [],
  };
}

function mapDonation(d) {
  if (!d) return null;
  return {
    id: d.id,
    campaignId: d.campaignId,
    donor: d.donorWallet,
    amount: Number(d.amount),
    txHash: d.txHash,
    createdAt: d.createdAt?.toISOString?.() || d.createdAt,
    status: d.status,
    message: d.message,
    verifiedOnChain: Boolean(d.verifiedOnChain),
    source:
      d.source === "ON_CHAIN" ? "on_chain" : d.source === "DEMO" ? "demo" : "application",
  };
}

function mapLedger(e) {
  if (!e) return null;
  return {
    id: e.id,
    type: e.type,
    campaignId: e.campaignId,
    amount: e.amount != null ? Number(e.amount) : undefined,
    milestoneIndex: e.milestoneIndex,
    actor: e.actor,
    txHash: e.txHash,
    note: e.note,
    proofNote: e.proofNote,
    verifiedOnChain: Boolean(e.verifiedOnChain),
    source:
      e.source === "ON_CHAIN" ? "on_chain" : e.source === "DEMO" ? "demo" : "application",
    createdAt: e.createdAt?.toISOString?.() || e.createdAt,
  };
}

function toLedgerSource(source, verifiedOnChain) {
  if (verifiedOnChain) return "ON_CHAIN";
  if (source === "on_chain") return "ON_CHAIN";
  if (source === "demo") return "DEMO";
  return "APPLICATION";
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureSeeded() {
  // Intentional no-op. Development data is created explicitly by
  // `npm run prisma:seed`; production never imports or copies store.json.
}

export const usersRepo = {
  async getByPublicKey(publicKey) {
    const u = await getPrisma().user.findUnique({ where: { walletAddress: publicKey } });
    return mapUser(u);
  },

  async findById(id) {
    const u = await getPrisma().user.findUnique({ where: { id } });
    return mapUser(u);
  },

  async upsertFromLogin(publicKey) {
    const prisma = getPrisma();
    const roles = seedRolesFor(publicKey);
    const role = primaryRole(roles);
    const existing = await prisma.user.findUnique({ where: { walletAddress: publicKey } });
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          walletAddress: publicKey,
          role,
          roles,
          status: "ACTIVE",
          lastLoginAt: new Date(),
          profile: { create: {} },
        },
      });
      return mapUser(created);
    }
    const merged = normalizeRoles([...(existing.roles || []), ...roles]);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        roles: merged,
        role: primaryRole(merged),
        lastLoginAt: new Date(),
      },
    });
    return mapUser(updated);
  },

  async addRole(publicKey, role) {
    const prisma = getPrisma();
    let user = await prisma.user.findUnique({ where: { walletAddress: publicKey } });
    if (!user) {
      return this.upsertFromLogin(publicKey).then(async () => {
        return this.addRole(publicKey, role);
      });
    }
    const roles = normalizeRoles([...(user.roles || []), role]);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { roles, role: primaryRole(roles) },
    });
    return mapUser(updated);
  },

  async updateStatus(userId, status) {
    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { status },
      });
      if (status !== "ACTIVE") {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
    return mapUser(updated);
  },

  async saveChallenge(row) {
    const prisma = getPrisma();
    await prisma.authChallenge.deleteMany({
      where: {
        OR: [
          { walletAddress: row.publicKey, usedAt: { not: null } },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
    await prisma.authChallenge.create({
      data: {
        walletAddress: row.publicKey,
        nonce: row.nonce,
        message: row.message,
        domain: row.domain || null,
        network: row.network || null,
        issuedAt: new Date(row.issuedAt || Date.now()),
        expiresAt: new Date(row.expiresAt),
      },
    });
    return row;
  },

  async getChallenge(publicKey, nonce) {
    const row = await getPrisma().authChallenge.findUnique({
      where: { walletAddress_nonce: { walletAddress: publicKey, nonce } },
    });
    if (!row) return null;
    return {
      publicKey: row.walletAddress,
      nonce: row.nonce,
      message: row.message,
      expiresAt: row.expiresAt.toISOString(),
      issuedAt: row.issuedAt.toISOString(),
      used: Boolean(row.usedAt),
    };
  },

  async consumeChallenge(publicKey, nonce) {
    const prisma = getPrisma();
    const row = await prisma.authChallenge.findUnique({
      where: { walletAddress_nonce: { walletAddress: publicKey, nonce } },
    });
    if (!row) return null;
    if (row.usedAt) return { ...row, publicKey: row.walletAddress, _alreadyUsed: true, used: true };
    const claimed = await prisma.authChallenge.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      return { ...row, publicKey: row.walletAddress, _alreadyUsed: true, used: true };
    }
    return {
      publicKey: row.walletAddress,
      nonce: row.nonce,
      message: row.message,
      expiresAt: row.expiresAt.toISOString(),
    };
  },
};

export const sessionsRepo = {
  /**
   * @param {{ id: string, userId: string, walletAddress: string, roles: string[], expiresAt: string }}
   * `id` is the raw token placed in the cookie; DB stores hash only.
   */
  async create({ id, userId, walletAddress, roles, expiresAt }) {
    const tokenHash = hashSessionToken(id);
    const row = await getPrisma().session.create({
      data: {
        tokenHash,
        userId,
        walletAddress,
        roles: roles || [Roles.DONOR],
        expiresAt: new Date(expiresAt),
        lastUsedAt: new Date(),
      },
    });
    return {
      id, // return raw token to caller
      dbId: row.id,
      userId: row.userId,
      walletAddress: row.walletAddress,
      roles: normalizeRoles(row.roles),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: null,
      lastUsedAt: row.lastUsedAt?.toISOString() || null,
    };
  },

  async find(rawToken) {
    if (!rawToken) return null;
    const tokenHash = hashSessionToken(rawToken);
    const row = await getPrisma().session.findUnique({ where: { tokenHash } });
    if (!row) return null;
    return {
      id: rawToken,
      dbId: row.id,
      userId: row.userId,
      walletAddress: row.walletAddress,
      roles: normalizeRoles(row.roles),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() || null,
      lastUsedAt: row.lastUsedAt?.toISOString() || null,
    };
  },

  async touch(rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await getPrisma().session.updateMany({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    });
    return this.find(rawToken);
  },

  async revoke(rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await getPrisma().session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.find(rawToken);
  },

  async revokeAllForUser(userId) {
    const result = await getPrisma().session.updateMany({
      where: { OR: [{ userId }, { walletAddress: userId }], revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },
};

export const auditRepo = {
  async create({ userId, action, resourceType, resourceId, ipAddress, userAgent, metadata }) {
    return getPrisma().auditLog.create({
      data: {
        userId: userId || null,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: metadata || undefined,
      },
    });
  },

  async findByUser(userId, { limit = 50 } = {}) {
    return getPrisma().auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async findRecent({ limit = 50 } = {}) {
    return getPrisma().auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};

export const profilesRepo = {
  async findByUserId(userId) {
    return getPrisma().profile.findUnique({ where: { userId } });
  },
  async create(userId, data = {}) {
    return getPrisma().profile.create({
      data: { userId, ...data },
    });
  },
  async update(userId, data) {
    return getPrisma().profile.update({
      where: { userId },
      data,
    });
  },
};

export const organizationsRepo = {
  async create(input) {
    return getPrisma().organization.create({
      data: {
        name: input.name,
        slug: input.slug || slugify(input.name),
        description: input.description || null,
        walletAddress: input.walletAddress || null,
        status: input.status || "PENDING",
      },
    });
  },
  async findById(id) {
    return getPrisma().organization.findUnique({ where: { id }, include: { members: true } });
  },
  async findBySlug(slug) {
    return getPrisma().organization.findUnique({ where: { slug } });
  },
  async addMember({ organizationId, userId, role = "MEMBER", status = "ACTIVE" }) {
    return getPrisma().organizationMember.create({
      data: { organizationId, userId, role, status },
    });
  },
  async listMembers(organizationId) {
    return getPrisma().organizationMember.findMany({ where: { organizationId } });
  },
};

export const campaignsRepo = {
  async list({ q, category, status } = {}) {
    await ensureSeeded();
    const rows = await getPrisma().campaign.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category && category !== "All"
          ? { category: { equals: category, mode: "insensitive" } }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { location: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapCampaign);
  },

  async getById(id) {
    await ensureSeeded();
    return mapCampaign(await getPrisma().campaign.findUnique({ where: { id } }));
  },

  async create(input) {
    await ensureSeeded();
    const prisma = getPrisma();
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
    if (!milestones.length) throw new Error("at least one milestone is required");

    let id = slugify(input.name) || uid("campaign");
    const exists = await prisma.campaign.findUnique({ where: { id } });
    if (exists) id = `${id}-${Date.now().toString(36)}`;

    let createdByUserId = null;
    if (input.createdBy) {
      const u = await prisma.user.findUnique({ where: { walletAddress: input.createdBy } });
      createdByUserId = u?.id || null;
    }

    const campaign = await prisma.campaign.create({
      data: {
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
        imageGradient: input.imageGradient || null,
        status: "active",
        createdByWallet: input.createdBy || null,
        createdByUserId,
        milestoneLabels: milestones,
        milestones: {
          create: milestones.map((milestone) => ({
            index: milestone.index,
            label: milestone.label,
            amount: milestone.amount,
          })),
        },
      },
    });

    await ledgerRepo.append({
      type: "campaign_created",
      campaignId: campaign.id,
      actor: input.createdBy || "organizer",
      note: `Campaign created: ${campaign.name}`,
      verifiedOnChain: false,
      source: "application",
    });

    return mapCampaign(campaign);
  },

  async setMilestonesVerified(id, count) {
    const c = await getPrisma().campaign.update({
      where: { id },
      data: { milestonesVerified: count },
    });
    return mapCampaign(c);
  },
};

export const donationsRepo = {
  async list({ donor, campaignId } = {}) {
    await ensureSeeded();
    const rows = await getPrisma().donation.findMany({
      where: {
        ...(donor ? { donorWallet: donor } : {}),
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDonation);
  },

  async findByTxHash(txHash) {
    if (!txHash) return null;
    return mapDonation(await getPrisma().donation.findUnique({ where: { txHash } }));
  },

  async create({
    campaignId,
    donor,
    amount,
    txHash = null,
    status = "escrowed",
    message = "",
    verifiedOnChain = false,
    source = "application",
  }) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      let donorUserId = null;
      const user = await tx.user.findUnique({ where: { walletAddress: donor } });
      donorUserId = user?.id || null;

      const donation = await tx.donation.create({
        data: {
          campaignId,
          donorWallet: donor,
          donorUserId,
          amount: Number(amount),
          txHash,
          status,
          message: String(message || "").slice(0, 200),
          verifiedOnChain: Boolean(verifiedOnChain),
          source: toLedgerSource(source, verifiedOnChain),
        },
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: { raised: { increment: Number(amount) } },
      });

      if (txHash && verifiedOnChain) {
        await tx.blockchainTransaction.create({
          data: {
            txHash,
            network: process.env.STELLAR_NETWORK || "TESTNET",
            operation: "deposit",
            status: "CONFIRMED",
            campaignId,
            donationId: donation.id,
            confirmedAt: new Date(),
          },
        });
      }

      await tx.ledgerEvent.create({
        data: {
          type: "donation",
          campaignId,
          amount: Number(amount),
          actor: donor,
          txHash,
          note: message ? `Donation escrowed — “${String(message).slice(0, 200)}”` : "Donation escrowed",
          verifiedOnChain: Boolean(verifiedOnChain),
          source: toLedgerSource(source, verifiedOnChain),
        },
      });

      return mapDonation(donation);
    });
  },
};

export const ledgerRepo = {
  async list({ campaignId, type, limit = 50 } = {}) {
    await ensureSeeded();
    const rows = await getPrisma().ledgerEvent.findMany({
      where: {
        ...(campaignId ? { campaignId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapLedger);
  },

  async findExisting({ txHash, type, campaignId } = {}) {
    if (!txHash || !type) return null;
    const row = await getPrisma().ledgerEvent.findFirst({
      where: {
        txHash,
        type,
        ...(campaignId ? { campaignId } : {}),
      },
    });
    return mapLedger(row);
  },

  async append(event) {
    if (event.txHash && event.type) {
      const existing = await this.findExisting({
        txHash: event.txHash,
        type: event.type,
        campaignId: event.campaignId,
      });
      if (existing) return { ...existing, _duplicate: true };
    }
    const verifiedOnChain = Boolean(event.verifiedOnChain);
    const row = await getPrisma().ledgerEvent.create({
      data: {
        type: event.type,
        campaignId: event.campaignId || null,
        amount: event.amount ?? null,
        milestoneIndex: event.milestoneIndex ?? null,
        actor: event.actor || null,
        txHash: event.txHash ?? null,
        note: event.note || null,
        proofNote: event.proofNote || null,
        verifiedOnChain,
        source: toLedgerSource(event.source, verifiedOnChain),
      },
    });
    return mapLedger(row);
  },
};

export const statsRepo = {
  async get() {
    await ensureSeeded();
    const prisma = getPrisma();
    const campaigns = await prisma.campaign.findMany();
    const donationsCount = await prisma.donation.count();
    const released = await prisma.ledgerEvent.aggregate({
      where: { type: "release" },
      _sum: { amount: true },
    });
    return {
      campaignsActive: campaigns.filter((c) => c.status === "active").length,
      totalRaised: campaigns.reduce((sum, c) => sum + Number(c.raised), 0),
      totalGoal: campaigns.reduce((sum, c) => sum + Number(c.goal), 0),
      milestonesVerified: campaigns.reduce((sum, c) => sum + Number(c.milestonesVerified || 0), 0),
      milestonesTotal: campaigns.reduce((sum, c) => sum + Number(c.milestonesTotal || 0), 0),
      donationsCount,
      amountReleased: Number(released._sum.amount || 0),
      categories: [...new Set(campaigns.map((c) => c.category).filter(Boolean))],
    };
  },

  async reset() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("reset disabled in production");
    }
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.blockchainTransaction.deleteMany(),
      prisma.ledgerEvent.deleteMany(),
      prisma.donation.deleteMany(),
      prisma.authChallenge.deleteMany(),
      prisma.session.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.organizationMember.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.profile.deleteMany(),
      prisma.indexedCursor.deleteMany(),
      prisma.campaign.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    return this.get();
  },
};

export const indexerRepo = {
  async getCursor(key) {
    const row = await getPrisma().indexedCursor.findUnique({ where: { cursorKey: key } });
    return row?.cursorValue || null;
  },
  async setCursor(key, value) {
    await getPrisma().indexedCursor.upsert({
      where: { cursorKey: key },
      create: { cursorKey: key, cursorValue: String(value) },
      update: { cursorValue: String(value) },
    });
    return value;
  },
};
