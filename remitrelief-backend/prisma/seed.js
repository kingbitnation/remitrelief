/**
 * Development seed — NEVER run against production.
 * Uses public-only Stellar addresses from env or safe development defaults.
 */

import "dotenv/config";
import { getPrisma, disconnectPrisma } from "../src/database/prisma.js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed production");
  process.exit(1);
}

// Public addresses only. Their private keys are neither known nor stored here.
const ADMIN =
  process.env.SEED_ADMIN_WALLET || "GD2LEBI4O76E6W4UTLV3EWJMMCIOM3VCEIPCP5VCCZNDFLTKTZ2EGE4V";
const DONOR =
  process.env.SEED_DONOR_WALLET || "GA67S7XRWR6XIWMAEJY5KPRQGYDBOVMAQVAAOYVLLHJAHLX7V74XTR4B";
const RECIPIENT =
  process.env.SEED_RECIPIENT_WALLET || "GCIGSQGDZLTXD26JRHTY6AIWB4II7B662JPSILGWVELT7IVMCXMDCAH7";
const NGO =
  process.env.SEED_NGO_WALLET || "GB5RJH4NW77KWB3ZBVFOCDYBPVWUQNSF7S5RQHV7WX2ISA4ZRYY76MXP";

async function main() {
  const prisma = getPrisma();

  const admin = await prisma.user.upsert({
    where: { walletAddress: ADMIN },
    create: {
      walletAddress: ADMIN,
      role: "ADMIN",
      roles: ["ADMIN", "DONOR"],
      status: "ACTIVE",
      profile: { create: { displayName: "Dev Admin" } },
    },
    update: { role: "ADMIN", roles: ["ADMIN", "DONOR"], status: "ACTIVE" },
  });

  await prisma.user.upsert({
    where: { walletAddress: DONOR },
    create: {
      walletAddress: DONOR,
      role: "DONOR",
      roles: ["DONOR"],
      status: "ACTIVE",
      profile: { create: { displayName: "Dev Donor" } },
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { walletAddress: RECIPIENT },
    create: {
      walletAddress: RECIPIENT,
      role: "RECIPIENT",
      roles: ["RECIPIENT", "DONOR"],
      status: "ACTIVE",
      profile: { create: { displayName: "Dev Recipient" } },
    },
    update: {},
  });

  const ngoUser = await prisma.user.upsert({
    where: { walletAddress: NGO },
    create: {
      walletAddress: NGO,
      role: "NGO",
      roles: ["NGO", "DONOR"],
      status: "ACTIVE",
      profile: { create: { displayName: "Dev NGO Operator" } },
    },
    update: { role: "NGO", roles: ["NGO", "DONOR"] },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "dev-relief-org" },
    create: {
      name: "Dev Relief Org",
      slug: "dev-relief-org",
      description: "Seeded development NGO (not verified for production)",
      walletAddress: NGO,
      status: "PENDING",
    },
    update: {},
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: ngoUser.id },
    },
    create: {
      organizationId: org.id,
      userId: ngoUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    update: { role: "OWNER" },
  });

  await prisma.campaign.upsert({
    where: { id: "development-relief-campaign" },
    create: {
      id: "development-relief-campaign",
      name: "Development Relief Campaign",
      location: "Stellar Testnet",
      description: "Non-production campaign seeded for local Phase 3 testing.",
      category: "Relief",
      goal: 10000,
      raised: 0,
      milestonesTotal: 2,
      milestonesVerified: 0,
      recipientName: "Development Recipient",
      status: "active",
      createdByWallet: NGO,
      createdByUserId: ngoUser.id,
      organizationId: org.id,
      milestoneLabels: [
        { index: 0, label: "Supplies staged", amount: 4000 },
        { index: 1, label: "Distribution complete", amount: 6000 },
      ],
      milestones: {
        create: [
          { index: 0, label: "Supplies staged", amount: 4000 },
          { index: 1, label: "Distribution complete", amount: 6000 },
        ],
      },
    },
    update: {},
  });

  console.log("Seed complete (development only)", {
    admin: admin.walletAddress,
    org: org.slug,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
