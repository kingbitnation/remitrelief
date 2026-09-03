/**
 * Centralized backend configuration.
 * Private secrets stay server-side — never import this module from Vite/frontend.
 */

import { Networks } from "@stellar/stellar-sdk";

const SUPPORTED_NETWORKS = new Set(["TESTNET", "FUTURENET", "STANDALONE"]);

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

function envRequired(name, { allowEmpty = false } = {}) {
  const value = process.env[name];
  if ((value == null || value === "") && !allowEmpty) {
    return null;
  }
  return value ?? "";
}

function resolvePassphrase(network, explicit) {
  if (explicit) return explicit;
  if (network === "TESTNET") return Networks.TESTNET;
  if (network === "PUBLIC" || network === "MAINNET") {
    throw new Error("UNSUPPORTED_NETWORK: mainnet is disabled in this release");
  }
  if (network === "FUTURENET") return "Test SDF Future Network ; October 2022";
  if (network === "STANDALONE") return "Standalone Network ; February 2017";
  throw new Error(`UNSUPPORTED_NETWORK: ${network}`);
}

function resolveExplorerBase(network) {
  if (network === "TESTNET") return "https://stellar.expert/explorer/testnet";
  if (network === "FUTURENET") return "https://stellar.expert/explorer/futurenet";
  return null;
}

let cached = null;

export function loadConfig({ fresh = false } = {}) {
  if (cached && !fresh) return cached;

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const network = (process.env.STELLAR_NETWORK || "TESTNET").toUpperCase();

  if (network === "PUBLIC" || network === "MAINNET") {
    throw new Error("UNSUPPORTED_NETWORK: mainnet is not enabled");
  }
  if (!SUPPORTED_NETWORKS.has(network) && network !== "TESTNET") {
    // Allow TESTNET always; others must be in the supported set
    if (!SUPPORTED_NETWORKS.has(network)) {
      throw new Error(`UNSUPPORTED_NETWORK: ${network}`);
    }
  }

  const demoModeRequested = envBool("DEMO_MODE", !isProduction);
  const demoMode = isProduction ? false : demoModeRequested;

  if (isProduction && demoModeRequested) {
    // Explicitly refuse demo financial mutations in production
    console.warn(
      "[config] DEMO_MODE was requested but NODE_ENV=production — demo financial mutations are DISABLED"
    );
  }

  const config = Object.freeze({
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT || 4000),
    demoMode,
    allowStoreReset: envBool("ALLOW_STORE_RESET", false) && !isProduction,

    stellar: Object.freeze({
      network,
      rpcUrl: process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
      horizonUrl: process.env.HORIZON_URL || "https://horizon-testnet.stellar.org",
      networkPassphrase: resolvePassphrase(network, process.env.NETWORK_PASSPHRASE),
      explorerBase: process.env.EXPLORER_BASE_URL || resolveExplorerBase(network),
      usdcDecimals: 7,
    }),

    /** Never log or return this value. */
    secrets: Object.freeze({
      backendSignerSecret: envRequired("BACKEND_SIGNER_SECRET", { allowEmpty: true }),
      /** Protects privileged release / internal ops until full RBAC exists. */
      internalApiKey: envRequired("INTERNAL_API_KEY", { allowEmpty: true }),
    }),

    demoEscrowContractId: envRequired("DEMO_ESCROW_CONTRACT_ID", { allowEmpty: true }) || null,
  });

  cached = config;
  return config;
}

export function resetConfigCache() {
  cached = null;
}

export function assertDemoModeAllowed() {
  const cfg = loadConfig();
  if (!cfg.demoMode) {
    const err = new Error("Demo financial mutations are disabled");
    err.code = "DEMO_MODE_DISABLED";
    err.status = 403;
    throw err;
  }
}

export function requireInternalApiKey(provided) {
  const cfg = loadConfig();
  if (!cfg.secrets.internalApiKey) {
    const err = new Error("INTERNAL_API_KEY is not configured — privileged ops unavailable");
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  if (!provided || provided !== cfg.secrets.internalApiKey) {
    const err = new Error("Invalid or missing internal API key");
    err.code = "UNAUTHORIZED";
    err.status = 401;
    throw err;
  }
}

/** Public-safe config snapshot for /health diagnostics (no secrets). */
export function publicConfig() {
  const cfg = loadConfig();
  return {
    network: cfg.stellar.network,
    demoMode: cfg.demoMode,
    explorerBase: cfg.stellar.explorerBase,
    rpcUrl: cfg.stellar.rpcUrl,
  };
}
