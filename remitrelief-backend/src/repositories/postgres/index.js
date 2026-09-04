import { query } from "../../db/pool.js";
import { getSeedSnapshot } from "../../data/store.js";

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

function mapCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description,
    category: row.category,
    goal: Number(row.goal),
    raised: Number(row.raised),
    milestonesTotal: row.milestones_total,
    milestonesVerified: row.milestones_verified,
    escrowAddress: row.escrow_address,
    usdcIssuer: row.usdc_issuer,
    recipientName: row.recipient_name,
    imageGradient: row.image_gradient,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    createdBy: row.created_by,
    milestoneLabels: row.milestone_labels || [],
  };
}

function mapDonation(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    donor: row.donor,
    amount: Number(row.amount),
    txHash: row.tx_hash,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    status: row.status,
    message: row.message,
    verifiedOnChain: Boolean(row.verified_on_chain),
    source: row.source,
  };
}

function mapLedger(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    campaignId: row.campaign_id,
    amount: row.amount != null ? Number(row.amount) : undefined,
    milestoneIndex: row.milestone_index,
    actor: row.actor,
    txHash: row.tx_hash,
    note: row.note,
    proofNote: row.proof_note,
    verifiedOnChain: Boolean(row.verified_on_chain),
    source: row.source,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

async function ensureSeeded() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM campaigns");
  if (rows[0].n > 0) return;
  const seed = getSeedSnapshot();
  for (const c of seed.campaigns) {
    await query(
      `INSERT INTO campaigns (
        id, name, location, description, category, goal, raised,
        milestones_total, milestones_verified, escrow_address, usdc_issuer,
        recipient_name, image_gradient, status, created_at, created_by, milestone_labels
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO NOTHING`,
      [
        c.id,
        c.name,
        c.location,
        c.description,
        c.category,
        c.goal,
        c.raised,
        c.milestonesTotal,
        c.milestonesVerified,
        c.escrowAddress,
        c.usdcIssuer,
        c.recipientName,
        c.imageGradient,
        c.status,
        c.createdAt,
        c.createdBy || null,
        JSON.stringify(c.milestoneLabels || []),
      ]
    );
  }
  for (const d of seed.donations) {
    await query(
      `INSERT INTO donations (
        id, campaign_id, donor, amount, tx_hash, created_at, status, message, verified_on_chain, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [
        d.id,
        d.campaignId,
        d.donor,
        d.amount,
        d.txHash,
        d.createdAt,
        d.status,
        d.message,
        d.verifiedOnChain,
        d.source,
      ]
    );
  }
  for (const e of seed.ledger) {
    await query(
      `INSERT INTO ledger_events (
        id, type, campaign_id, amount, milestone_index, actor, tx_hash, note, proof_note,
        verified_on_chain, source, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [
        e.id,
        e.type,
        e.campaignId,
        e.amount ?? null,
        e.milestoneIndex ?? null,
        e.actor,
        e.txHash,
        e.note,
        e.proofNote ?? null,
        e.verifiedOnChain,
        e.source,
        e.createdAt,
      ]
    );
  }
}

function seedRolesFor(publicKey) {
  const roles = new Set(["DONOR"]);
  const admins = new Set(
    `${process.env.ADMIN_PUBLIC_KEYS || ""},${process.env.OPERATOR_PUBLIC_KEYS || ""}`
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const ngos = new Set(
    `${process.env.NGO_PUBLIC_KEYS || ""},${process.env.VERIFIER_PUBLIC_KEYS || ""}`
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const recipients = new Set(
    (process.env.RECIPIENT_PUBLIC_KEYS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (admins.has(publicKey)) roles.add("ADMIN");
  if (ngos.has(publicKey)) roles.add("NGO");
  if (recipients.has(publicKey)) roles.add("RECIPIENT");
  const demo =
    process.env.NODE_ENV !== "production" &&
    (process.env.DEMO_MODE == null ||
      ["1", "true", "yes", "on"].includes(String(process.env.DEMO_MODE).toLowerCase()));
  if (demo && ngos.size === 0) roles.add("NGO");
  return [...roles];
}

export const campaignsRepo = {
  async list({ q, category, status } = {}) {
    await ensureSeeded();
    let sql = "SELECT * FROM campaigns WHERE 1=1";
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (category && category !== "All") {
      params.push(category.toLowerCase());
      sql += ` AND lower(category) = $${params.length}`;
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      sql += ` AND (
        lower(name) LIKE $${params.length}
        OR lower(location) LIKE $${params.length}
        OR lower(coalesce(description,'')) LIKE $${params.length}
        OR lower(coalesce(category,'')) LIKE $${params.length}
      )`;
    }
    sql += " ORDER BY created_at DESC";
    const { rows } = await query(sql, params);
    return rows.map(mapCampaign);
  },

  async getById(id) {
    await ensureSeeded();
    const { rows } = await query("SELECT * FROM campaigns WHERE id = $1", [id]);
    return mapCampaign(rows[0]);
  },

  async create(input) {
    await ensureSeeded();
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
    const existing = await query("SELECT 1 FROM campaigns WHERE id = $1", [id]);
    if (existing.rowCount) id = `${id}-${Date.now().toString(36)}`;

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
      imageGradient: input.imageGradient || null,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy || null,
      milestoneLabels: milestones,
    };

    await query(
      `INSERT INTO campaigns (
        id, name, location, description, category, goal, raised,
        milestones_total, milestones_verified, escrow_address, usdc_issuer,
        recipient_name, image_gradient, status, created_at, created_by, milestone_labels
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        campaign.id,
        campaign.name,
        campaign.location,
        campaign.description,
        campaign.category,
        campaign.goal,
        campaign.raised,
        campaign.milestonesTotal,
        campaign.milestonesVerified,
        campaign.escrowAddress,
        campaign.usdcIssuer,
        campaign.recipientName,
        campaign.imageGradient,
        campaign.status,
        campaign.createdAt,
        campaign.createdBy,
        JSON.stringify(campaign.milestoneLabels),
      ]
    );

    await ledgerRepo.append({
      type: "campaign_created",
      campaignId: campaign.id,
      actor: input.createdBy || "organizer",
      note: `Campaign created: ${campaign.name}`,
      verifiedOnChain: false,
      source: "application",
    });

    return campaign;
  },

  async setMilestonesVerified(id, count) {
    await query("UPDATE campaigns SET milestones_verified = $2 WHERE id = $1", [id, count]);
    return this.getById(id);
  },
};

export const donationsRepo = {
  async list({ donor, campaignId } = {}) {
    await ensureSeeded();
    let sql = "SELECT * FROM donations WHERE 1=1";
    const params = [];
    if (donor) {
      params.push(donor);
      sql += ` AND donor = $${params.length}`;
    }
    if (campaignId) {
      params.push(campaignId);
      sql += ` AND campaign_id = $${params.length}`;
    }
    sql += " ORDER BY created_at DESC";
    const { rows } = await query(sql, params);
    return rows.map(mapDonation);
  },

  async findByTxHash(txHash) {
    if (!txHash) return null;
    const { rows } = await query("SELECT * FROM donations WHERE tx_hash = $1", [txHash]);
    return mapDonation(rows[0]);
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
    const entry = {
      id: uid("don"),
      campaignId,
      donor,
      amount: Number(amount),
      txHash,
      createdAt: new Date().toISOString(),
      status,
      message: String(message || "").slice(0, 200),
      verifiedOnChain: Boolean(verifiedOnChain),
      source,
    };
    await query(
      `INSERT INTO donations (
        id, campaign_id, donor, amount, tx_hash, created_at, status, message, verified_on_chain, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        entry.id,
        entry.campaignId,
        entry.donor,
        entry.amount,
        entry.txHash,
        entry.createdAt,
        entry.status,
        entry.message,
        entry.verifiedOnChain,
        entry.source,
      ]
    );
    await query("UPDATE campaigns SET raised = raised + $2 WHERE id = $1", [
      campaignId,
      Number(amount),
    ]);
    await ledgerRepo.append({
      type: "donation",
      campaignId,
      amount: Number(amount),
      actor: donor,
      txHash,
      note: message ? `Donation escrowed — “${entry.message}”` : "Donation escrowed",
      verifiedOnChain: Boolean(verifiedOnChain),
      source: verifiedOnChain ? "on_chain" : source || "demo",
    });
    return entry;
  },
};

export const ledgerRepo = {
  async list({ campaignId, type, limit = 50 } = {}) {
    await ensureSeeded();
    let sql = "SELECT * FROM ledger_events WHERE 1=1";
    const params = [];
    if (campaignId) {
      params.push(campaignId);
      sql += ` AND campaign_id = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const { rows } = await query(sql, params);
    return rows.map(mapLedger);
  },

  async findExisting({ txHash, type, campaignId } = {}) {
    if (!txHash || !type) return null;
    const { rows } = await query(
      `SELECT * FROM ledger_events
       WHERE tx_hash = $1 AND type = $2 AND ($3::text IS NULL OR campaign_id = $3)
       LIMIT 1`,
      [txHash, type, campaignId ?? null]
    );
    return mapLedger(rows[0]);
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
    const entry = {
      id: uid("led"),
      createdAt: new Date().toISOString(),
      txHash: event.txHash ?? null,
      type: event.type,
      campaignId: event.campaignId,
      amount: event.amount,
      milestoneIndex: event.milestoneIndex,
      actor: event.actor,
      note: event.note,
      proofNote: event.proofNote,
      verifiedOnChain,
      source: verifiedOnChain ? "on_chain" : event.source || "demo",
    };
    await query(
      `INSERT INTO ledger_events (
        id, type, campaign_id, amount, milestone_index, actor, tx_hash, note, proof_note,
        verified_on_chain, source, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        entry.id,
        entry.type,
        entry.campaignId ?? null,
        entry.amount ?? null,
        entry.milestoneIndex ?? null,
        entry.actor ?? null,
        entry.txHash,
        entry.note ?? null,
        entry.proofNote ?? null,
        entry.verifiedOnChain,
        entry.source,
        entry.createdAt,
      ]
    );
    return entry;
  },
};

export const statsRepo = {
  async get() {
    await ensureSeeded();
    const { rows: campaigns } = await query("SELECT * FROM campaigns");
    const { rows: donations } = await query("SELECT COUNT(*)::int AS n FROM donations");
    const { rows: released } = await query(
      `SELECT COALESCE(SUM(amount),0)::float AS total FROM ledger_events WHERE type = 'release'`
    );
    return {
      campaignsActive: campaigns.filter((c) => c.status === "active").length,
      totalRaised: campaigns.reduce((sum, c) => sum + Number(c.raised), 0),
      totalGoal: campaigns.reduce((sum, c) => sum + Number(c.goal), 0),
      milestonesVerified: campaigns.reduce((sum, c) => sum + Number(c.milestones_verified || 0), 0),
      milestonesTotal: campaigns.reduce((sum, c) => sum + Number(c.milestones_total || 0), 0),
      donationsCount: donations[0].n,
      amountReleased: Number(released[0].total || 0),
      categories: [...new Set(campaigns.map((c) => c.category).filter(Boolean))],
    };
  },

  async reset() {
    await query("DELETE FROM ledger_events");
    await query("DELETE FROM donations");
    await query("DELETE FROM auth_nonces");
    await query("DELETE FROM sessions");
    await query("DELETE FROM users");
    await query("DELETE FROM indexed_cursors");
    await query("DELETE FROM campaigns");
    await ensureSeeded();
    return this.get();
  },
};

export const usersRepo = {
  async getByPublicKey(publicKey) {
    const { rows } = await query("SELECT * FROM users WHERE public_key = $1", [publicKey]);
    if (!rows[0]) return null;
    return {
      id: rows[0].public_key,
      publicKey: rows[0].public_key,
      walletAddress: rows[0].public_key,
      roles: rows[0].roles || ["DONOR"],
      status: "active",
      createdAt: rows[0].created_at,
      lastLoginAt: rows[0].last_login_at,
    };
  },

  async upsertFromLogin(publicKey) {
    const roles = seedRolesFor(publicKey);
    const existing = await this.getByPublicKey(publicKey);
    if (!existing) {
      await query(
        `INSERT INTO users (public_key, roles, created_at, last_login_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())`,
        [publicKey, JSON.stringify(roles)]
      );
    } else {
      const merged = [...new Set([...(existing.roles || []), ...roles])];
      await query(
        `UPDATE users SET roles = $2::jsonb, last_login_at = NOW() WHERE public_key = $1`,
        [publicKey, JSON.stringify(merged)]
      );
    }
    return this.getByPublicKey(publicKey);
  },

  async addRole(publicKey, role) {
    const user = (await this.getByPublicKey(publicKey)) || (await this.upsertFromLogin(publicKey));
    const roles = [...new Set([...(user.roles || []), role])];
    await query(`UPDATE users SET roles = $2::jsonb WHERE public_key = $1`, [
      publicKey,
      JSON.stringify(roles),
    ]);
    return this.getByPublicKey(publicKey);
  },

  async saveChallenge({ publicKey, nonce, expiresAt, message }) {
    await query(`DELETE FROM auth_nonces WHERE public_key = $1 OR expires_at < NOW()`, [publicKey]);
    await query(
      `INSERT INTO auth_nonces (public_key, nonce, expires_at, message)
       VALUES ($1,$2,$3,$4)`,
      [publicKey, nonce, expiresAt, message]
    );
    return { publicKey, nonce, expiresAt, message };
  },

  async getChallenge(publicKey, nonce) {
    const { rows } = await query(
      `SELECT * FROM auth_nonces WHERE public_key = $1 AND nonce = $2`,
      [publicKey, nonce]
    );
    if (!rows[0]) return null;
    return {
      publicKey: rows[0].public_key,
      nonce: rows[0].nonce,
      expiresAt: rows[0].expires_at?.toISOString?.() || rows[0].expires_at,
      message: rows[0].message,
      used: false,
    };
  },

  async consumeChallenge(publicKey, nonce) {
    const { rows } = await query(
      `DELETE FROM auth_nonces WHERE public_key = $1 AND nonce = $2 RETURNING *`,
      [publicKey, nonce]
    );
    if (!rows[0]) return null;
    return {
      publicKey: rows[0].public_key,
      nonce: rows[0].nonce,
      expiresAt: rows[0].expires_at?.toISOString?.() || rows[0].expires_at,
      message: rows[0].message,
    };
  },
};

export const sessionsRepo = {
  async create({ id, userId, walletAddress, roles, expiresAt }) {
    await query(
      `INSERT INTO sessions (id, user_id, wallet_address, roles, created_at, expires_at, last_used_at)
       VALUES ($1,$2,$3,$4::jsonb,NOW(),$5,NOW())`,
      [id, userId, walletAddress, JSON.stringify(roles || ["DONOR"]), expiresAt]
    );
    return this.find(id);
  },

  async find(id) {
    const { rows } = await query(`SELECT * FROM sessions WHERE id = $1`, [id]);
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      walletAddress: rows[0].wallet_address,
      roles: rows[0].roles || ["DONOR"],
      createdAt: rows[0].created_at?.toISOString?.() || rows[0].created_at,
      expiresAt: rows[0].expires_at?.toISOString?.() || rows[0].expires_at,
      revokedAt: rows[0].revoked_at?.toISOString?.() || rows[0].revoked_at,
      lastUsedAt: rows[0].last_used_at?.toISOString?.() || rows[0].last_used_at,
    };
  },

  async touch(id) {
    await query(`UPDATE sessions SET last_used_at = NOW() WHERE id = $1`, [id]);
    return this.find(id);
  },

  async revoke(id) {
    await query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`, [id]);
    return this.find(id);
  },

  async revokeAllForUser(userId) {
    const { rowCount } = await query(
      `UPDATE sessions SET revoked_at = NOW()
       WHERE (user_id = $1 OR wallet_address = $1) AND revoked_at IS NULL`,
      [userId]
    );
    return rowCount || 0;
  },
};

export const indexerRepo = {
  async getCursor(key) {
    const { rows } = await query(
      "SELECT cursor_value FROM indexed_cursors WHERE cursor_key = $1",
      [key]
    );
    return rows[0]?.cursor_value || null;
  },

  async setCursor(key, value) {
    await query(
      `INSERT INTO indexed_cursors (cursor_key, cursor_value, updated_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (cursor_key) DO UPDATE SET cursor_value = EXCLUDED.cursor_value, updated_at = NOW()`,
      [key, value]
    );
    return value;
  },
};
