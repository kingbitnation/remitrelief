import { rpc } from "@stellar/stellar-sdk";
import { loadConfig } from "../../config.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";

let serverSingleton = null;

export function getSorobanServer({ fresh = false } = {}) {
  if (serverSingleton && !fresh) return serverSingleton;
  const { stellar } = loadConfig();
  serverSingleton = new rpc.Server(stellar.rpcUrl, { allowHttp: false });
  return serverSingleton;
}

export function getNetworkPassphrase() {
  return loadConfig().stellar.networkPassphrase;
}

export function resetSorobanClient() {
  serverSingleton = null;
}

export async function getAccount(publicKey) {
  try {
    return await getSorobanServer().getAccount(publicKey);
  } catch (err) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, `Could not load account ${publicKey}`, {
      details: { reason: err.message },
    });
  }
}

export async function getTransaction(hash) {
  return getSorobanServer().getTransaction(hash);
}

export async function sendTransaction(tx) {
  return getSorobanServer().sendTransaction(tx);
}

export async function simulateTransaction(tx) {
  return getSorobanServer().simulateTransaction(tx);
}
