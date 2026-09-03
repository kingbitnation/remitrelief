import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

describe("config + demo mode gating", () => {
  const original = { ...process.env };

  after(() => {
    process.env = { ...original };
  });

  it("defaults DEMO_MODE on in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.DEMO_MODE;
    process.env.STELLAR_NETWORK = "TESTNET";
    const { resetConfigCache, loadConfig } = await import("../src/config.js");
    resetConfigCache();
    const cfg = loadConfig({ fresh: true });
    assert.equal(cfg.demoMode, true);
  });

  it("forces demoMode false in production even if DEMO_MODE=true", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEMO_MODE = "true";
    process.env.STELLAR_NETWORK = "TESTNET";
    const { resetConfigCache, loadConfig, assertDemoModeAllowed } = await import("../src/config.js");
    resetConfigCache();
    const cfg = loadConfig({ fresh: true });
    assert.equal(cfg.demoMode, false);
    assert.throws(() => assertDemoModeAllowed(), /Demo financial mutations are disabled/);
  });

  it("rejects mainnet network", async () => {
    process.env.NODE_ENV = "development";
    process.env.STELLAR_NETWORK = "MAINNET";
    const { resetConfigCache, loadConfig } = await import("../src/config.js");
    resetConfigCache();
    assert.throws(() => loadConfig({ fresh: true }), /UNSUPPORTED_NETWORK/);
  });

  it("requireInternalApiKey rejects missing/wrong keys", async () => {
    process.env.NODE_ENV = "development";
    process.env.STELLAR_NETWORK = "TESTNET";
    process.env.INTERNAL_API_KEY = "test-internal-key";
    delete process.env.DEMO_MODE;
    const { resetConfigCache, requireInternalApiKey } = await import("../src/config.js");
    resetConfigCache();
    assert.throws(() => requireInternalApiKey(undefined), /Invalid or missing/);
    assert.throws(() => requireInternalApiKey("wrong"), /Invalid or missing/);
    assert.doesNotThrow(() => requireInternalApiKey("test-internal-key"));
  });
});

describe("AppError mapping", () => {
  it("maps codes to HTTP statuses", async () => {
    const { AppError, ErrorCodes, toErrorResponse } = await import("../src/lib/errors.js");
    const err = new AppError(ErrorCodes.UNAUTHORIZED, "nope");
    const { status, body } = toErrorResponse(err);
    assert.equal(status, 401);
    assert.equal(body.code, "UNAUTHORIZED");
  });
});

describe("donation recording security", () => {
  before(() => {
    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";
    process.env.STELLAR_NETWORK = "TESTNET";
    process.env.ALLOW_STORE_RESET = "true";
  });

  it("allows demo donation when DEMO_MODE and no escrow", async () => {
    const { resetConfigCache } = await import("../src/config.js");
    resetConfigCache();
    const { recordVerifiedDonation } = await import("../src/services/donationsService.js");
    const { statsRepo } = await import("../src/repositories/index.js");
    statsRepo.reset();

    const entry = await recordVerifiedDonation({
      campaignId: "wildfire-relief-california",
      donor: "GTESTDONORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: 12,
      demo: true,
      message: "phase2 test",
    });

    assert.equal(entry.verifiedOnChain, false);
    assert.equal(entry.source, "demo");
    assert.equal(entry.status, "demo-escrowed");
  });

  it("rejects on-chain donation without txHash", async () => {
    const { resetConfigCache } = await import("../src/config.js");
    resetConfigCache();
    const { recordVerifiedDonation } = await import("../src/services/donationsService.js");
    const { campaignsRepo } = await import("../src/repositories/index.js");

    const campaign = campaignsRepo.create({
      name: "Escrow Gate Test",
      location: "Testnet",
      goal: 1000,
      description: "test",
      category: "Relief",
      recipientName: "Test Org",
      milestones: [{ label: "Stage 1", amount: 1000 }],
      escrowAddress: "CCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKWX",
    });

    await assert.rejects(
      () =>
        recordVerifiedDonation({
          campaignId: campaign.id,
          donor: "GTESTDONORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          amount: 5,
        }),
      (err) => err.code === "TRANSACTION_NOT_VERIFIED" || /txHash required/.test(err.message)
    );
  });

  it("rejects demo donation when production disables DEMO_MODE", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEMO_MODE = "true";
    process.env.STELLAR_NETWORK = "TESTNET";
    const { resetConfigCache } = await import("../src/config.js");
    resetConfigCache();
    const { recordVerifiedDonation } = await import("../src/services/donationsService.js");

    await assert.rejects(
      () =>
        recordVerifiedDonation({
          campaignId: "wildfire-relief-california",
          donor: "GTESTDONORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          amount: 9,
          demo: true,
        }),
      (err) => err.code === "DEMO_MODE_DISABLED"
    );

    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";
    resetConfigCache();
  });
});

describe("release endpoint protection", () => {
  it("blocks real release without internal key", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";
    process.env.STELLAR_NETWORK = "TESTNET";
    process.env.INTERNAL_API_KEY = "secret-release-key";
    const { resetConfigCache } = await import("../src/config.js");
    resetConfigCache();
    const { releaseMilestone } = await import("../src/services/milestonesService.js");

    await assert.rejects(
      () =>
        releaseMilestone({
          id: "flood-relief-oaxaca",
          escrowAddress: "CCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKWX",
          milestoneIndex: 0,
          campaignId: "flood-relief-oaxaca",
        }),
      /Invalid or missing internal API key|UNAUTHORIZED/
    );
  });

  it("allows demo release when DEMO_MODE", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";
    process.env.STELLAR_NETWORK = "TESTNET";
    const { resetConfigCache } = await import("../src/config.js");
    resetConfigCache();
    const { releaseMilestone } = await import("../src/services/milestonesService.js");
    const result = await releaseMilestone({
      id: "wildfire-relief-california",
      campaignId: "wildfire-relief-california",
      milestoneIndex: 0,
      amount: 100,
      demo: true,
    });
    assert.equal(result.demo, true);
    assert.equal(result.event.verifiedOnChain, false);
  });
});

describe("invocation assertion helper", () => {
  it("rejects transactions with no invoke ops", async () => {
    const { assertExpectedInvocation } = await import("../src/blockchain/soroban/verification.js");
    const fakeTx = { operations: [{ type: "payment" }] };
    assert.throws(
      () =>
        assertExpectedInvocation(fakeTx, {
          escrowAddress: "CABC",
          functionName: "deposit",
        }),
      /does not invoke a contract|INVALID_CONTRACT_CALL/
    );
  });
});
