import {
  Contract,
  rpc,
  TransactionBuilder,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { loadConfig } from "../../config.js";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import {
  getAccount,
  getNetworkPassphrase,
  getSorobanServer,
  getTransaction,
  sendTransaction,
  simulateTransaction,
} from "./client.js";

function backendKeypair() {
  const secret = loadConfig().secrets.backendSignerSecret;
  if (!secret) {
    throw new AppError(ErrorCodes.FORBIDDEN, "BACKEND_SIGNER_SECRET is not configured");
  }
  return Keypair.fromSecret(secret);
}

async function buildInvocation(sourcePublicKey, contractId, method, args = []) {
  const account = await getAccount(sourcePublicKey);
  const contract = new Contract(contractId);
  const networkPassphrase = getNetworkPassphrase();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, `Simulation failed: ${sim.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  return { tx: prepared, sim };
}

export async function pollTransaction(hash, { intervalMs = 1500, timeoutMs = 30000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await getTransaction(hash);
    if (res.status === "SUCCESS") return { hash, status: res.status, result: res };
    if (res.status === "FAILED") {
      throw new AppError(ErrorCodes.TRANSACTION_FAILED, `Transaction failed: ${hash}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new AppError(ErrorCodes.TRANSACTION_FAILED, `Transaction ${hash} did not settle in time`);
}

export async function getEscrowBalance(escrowAddress) {
  const kp = backendKeypair();
  const { sim } = await buildInvocation(kp.publicKey(), escrowAddress, "balance");
  const result = sim.result?.retval;
  return result ? scValToNative(result) : 0;
}

export async function getMilestones(escrowAddress) {
  const kp = backendKeypair();
  const { sim } = await buildInvocation(kp.publicKey(), escrowAddress, "get_milestones");
  const result = sim.result?.retval;
  return result ? scValToNative(result) : [];
}

export async function buildDepositXdr({ escrowAddress, donorPublicKey, amountStroops }) {
  if (!Number.isFinite(amountStroops) || amountStroops <= 0) {
    throw new AppError(ErrorCodes.INVALID_REQUEST, "Deposit amount must be > 0");
  }
  const { tx } = await buildInvocation(donorPublicKey, escrowAddress, "deposit", [
    new Address(donorPublicKey).toScVal(),
    nativeToScVal(amountStroops, { type: "i128" }),
  ]);
  return { unsignedXdr: tx.toXDR() };
}

export async function buildVerifyMilestoneXdr({ escrowAddress, milestoneIndex, verifierPublicKey }) {
  const { tx } = await buildInvocation(verifierPublicKey, escrowAddress, "verify_milestone", [
    new Address(verifierPublicKey).toScVal(),
    nativeToScVal(Number(milestoneIndex), { type: "u32" }),
  ]);
  return { unsignedXdr: tx.toXDR() };
}

export async function releaseMilestoneFunds({ escrowAddress, milestoneIndex }) {
  const kp = backendKeypair();
  const { tx } = await buildInvocation(kp.publicKey(), escrowAddress, "release", [
    nativeToScVal(Number(milestoneIndex), { type: "u32" }),
  ]);
  tx.sign(kp);

  logger.info("Submitting release transaction", { escrowAddress, milestoneIndex });
  const sendResult = await sendTransaction(tx);
  if (sendResult.status === "ERROR") {
    throw new AppError(ErrorCodes.TRANSACTION_FAILED, "Release submission failed");
  }
  return pollTransaction(sendResult.hash);
}

export async function submitSignedXdr(signedXdr) {
  const networkPassphrase = getNetworkPassphrase();
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const sendResult = await sendTransaction(tx);
  if (sendResult.status === "ERROR") {
    throw new AppError(ErrorCodes.TRANSACTION_FAILED, "Transaction submission failed");
  }
  return pollTransaction(sendResult.hash);
}

export function parseSignedTransaction(signedXdr) {
  try {
    return TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  } catch (err) {
    throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, "Invalid transaction XDR for configured network", {
      details: { reason: err.message },
    });
  }
}

/** Expose server for tests / advanced callers */
export { getSorobanServer };
