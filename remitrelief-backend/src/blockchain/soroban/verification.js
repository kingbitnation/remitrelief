import { xdr, StrKey, Address, scValToNative } from "@stellar/stellar-sdk";
import { AppError, ErrorCodes } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { getTransaction } from "./client.js";
import { parseSignedTransaction } from "./transactions.js";
import { loadConfig } from "../../config.js";

/**
 * Extract invoke-host-function contract calls from a Transaction.
 * Returns [{ contractId, functionName, argsScVal[] }]
 */
export function extractContractInvocations(tx) {
  const invocations = [];
  for (const op of tx.operations) {
    if (op.type !== "invokeHostFunction") continue;
    const hostFn = op.func;
    if (!hostFn) continue;

    // SDK v12: op.func may already be parsed; also support raw XDR
    let hostFunction = hostFn;
    if (typeof hostFn.toXDR === "function" || hostFn._switch) {
      hostFunction = hostFn;
    }

    try {
      const switchName = hostFunction.switch?.()?.name || hostFunction._arm;
      const isInvoke =
        switchName === "hostFnTypeInvokeContract" ||
        switchName === "invokeContract" ||
        hostFunction.invokeContract != null ||
        (typeof hostFunction.switch === "function" &&
          hostFunction.switch() === xdr.HostFunctionType.hostFnTypeInvokeContract());

      if (!isInvoke && !hostFunction.invokeContract && typeof hostFunction.invokeContract !== "function") {
        // Try value path
        const value =
          typeof hostFunction.value === "function" ? hostFunction.value() : hostFunction.invokeContract?.();
        if (!value) continue;
      }

      const invoke =
        typeof hostFunction.invokeContract === "function"
          ? hostFunction.invokeContract()
          : hostFunction._value || hostFunction.value?.();

      if (!invoke) continue;

      const rawContract = typeof invoke.contractAddress === "function" ? invoke.contractAddress() : invoke._attributes?.contractAddress;
      const rawFn = typeof invoke.functionName === "function" ? invoke.functionName() : invoke._attributes?.functionName;
      const rawArgs = typeof invoke.args === "function" ? invoke.args() : invoke._attributes?.args || [];

      let contractId;
      try {
        contractId = Address.fromScAddress(rawContract).toString();
      } catch {
        try {
          contractId = StrKey.encodeContract(rawContract.contractId());
        } catch {
          contractId = null;
        }
      }

      const functionName =
        typeof rawFn === "string"
          ? rawFn
          : rawFn?.toString?.() || String(rawFn || "");

      invocations.push({
        contractId,
        functionName,
        args: rawArgs,
      });
    } catch (err) {
      logger.debug("Could not parse invokeHostFunction op", { reason: err.message });
    }
  }

  // Fallback: use operation convenience fields when present (stellar-sdk Operation objects)
  if (!invocations.length) {
    for (const op of tx.operations) {
      if (op.type === "invokeHostFunction" && op.func) {
        const parsed = tryParseFromOperationFields(op);
        if (parsed) invocations.push(parsed);
      }
    }
  }

  return invocations;
}

function tryParseFromOperationFields(op) {
  // Some SDK builds expose auth / func differently — best-effort
  try {
    const func = op.func;
    if (func?.switch?.().name === "hostFnTypeInvokeContract" || func?._arm === "invokeContract") {
      const invoke = func.invokeContract();
      const contractId = Address.fromScAddress(invoke.contractAddress()).toString();
      const functionName = invoke.functionName().toString();
      const args = invoke.args();
      return { contractId, functionName, args };
    }
  } catch {
    return null;
  }
  return null;
}

function scArgToNativeSafe(scVal) {
  try {
    return scValToNative(scVal);
  } catch {
    try {
      if (scVal.address) {
        return Address.fromScAddress(scVal.address()).toString();
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Assert a signed/prepared transaction invokes the expected escrow method.
 */
export function assertExpectedInvocation(tx, { escrowAddress, functionName, expectedArgs = {} }) {
  const invocations = extractContractInvocations(tx);
  if (!invocations.length) {
    throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, "Transaction does not invoke a contract");
  }

  const match = invocations.find(
    (inv) =>
      inv.contractId === escrowAddress &&
      (inv.functionName === functionName || inv.functionName?.includes?.(functionName))
  );

  if (!match) {
    throw new AppError(
      ErrorCodes.INVALID_CONTRACT_CALL,
      `Expected ${functionName} on ${escrowAddress}`,
      {
        details: {
          found: invocations.map((i) => ({ contractId: i.contractId, functionName: i.functionName })),
        },
      }
    );
  }

  const natives = (match.args || []).map(scArgToNativeSafe);

  if (expectedArgs.address != null) {
    const found = natives.find((a) => typeof a === "string" && a === expectedArgs.address);
    if (!found && natives[0] !== expectedArgs.address) {
      // Soft check — address might be first arg
      const first = natives[0];
      if (first && first !== expectedArgs.address) {
        throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, "Invocation address argument mismatch", {
          details: { expected: expectedArgs.address, got: first },
        });
      }
    }
  }

  if (expectedArgs.milestoneIndex != null) {
    const idx = Number(expectedArgs.milestoneIndex);
    const hasIndex = natives.some((a) => Number(a) === idx);
    if (!hasIndex) {
      throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, "Invocation milestone index mismatch", {
        details: { expected: idx, args: natives },
      });
    }
  }

  if (expectedArgs.amountStroops != null) {
    const amount = expectedArgs.amountStroops;
    const hasAmount = natives.some((a) => {
      try {
        return BigInt(a) === BigInt(amount);
      } catch {
        return Number(a) === Number(amount);
      }
    });
    if (!hasAmount) {
      throw new AppError(ErrorCodes.INVALID_CONTRACT_CALL, "Invocation amount mismatch", {
        details: { expected: String(amount), args: natives.map(String) },
      });
    }
  }

  return match;
}

export async function waitForSuccessfulTransaction(txHash) {
  const started = Date.now();
  const timeoutMs = 45000;
  while (Date.now() - started < timeoutMs) {
    const res = await getTransaction(txHash);
    if (res.status === "SUCCESS") return res;
    if (res.status === "FAILED") {
      throw new AppError(ErrorCodes.TRANSACTION_FAILED, `Transaction ${txHash} failed on-chain`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new AppError(ErrorCodes.TRANSACTION_NOT_FOUND, `Transaction ${txHash} not found or pending`);
}

/**
 * Verify a completed deposit transaction before recording a donation.
 */
export async function verifyDonationTransaction({
  txHash,
  escrowAddress,
  donorPublicKey,
  amountStroops,
}) {
  if (!txHash) {
    throw new AppError(ErrorCodes.TRANSACTION_NOT_VERIFIED, "txHash is required");
  }
  if (!escrowAddress) {
    throw new AppError(ErrorCodes.ESCROW_NOT_FOUND, "escrowAddress is required");
  }

  const res = await waitForSuccessfulTransaction(txHash);

  // Prefer envelope from getTransaction when available
  let tx = null;
  try {
    if (res.envelopeXdr) {
      const { TransactionBuilder } = await import("@stellar/stellar-sdk");
      tx = TransactionBuilder.fromXDR(res.envelopeXdr, loadConfig().stellar.networkPassphrase);
    }
  } catch (err) {
    logger.warn("Could not parse envelopeXdr from getTransaction", { txHash, reason: err.message });
  }

  if (tx) {
    assertExpectedInvocation(tx, {
      escrowAddress,
      functionName: "deposit",
      expectedArgs: { address: donorPublicKey, amountStroops },
    });
  } else {
    // Fallback: success on-chain is required; warn that deep invoke parse was unavailable
    logger.warn("Donation verified by SUCCESS status only (envelope parse unavailable)", { txHash });
  }

  return {
    txHash,
    status: "SUCCESS",
    escrowAddress,
    donorPublicKey,
    amountStroops,
    verifiedOnChain: true,
  };
}

/**
 * Validate signed verify_milestone XDR before network submit.
 */
export function verifyMilestoneVerificationTransaction({
  signedXdr,
  escrowAddress,
  milestoneIndex,
  verifierPublicKey,
}) {
  const tx = parseSignedTransaction(signedXdr);
  assertExpectedInvocation(tx, {
    escrowAddress,
    functionName: "verify_milestone",
    expectedArgs: { address: verifierPublicKey, milestoneIndex: Number(milestoneIndex) },
  });
  return { tx, valid: true };
}

/**
 * Validate a release transaction hash / envelope if provided.
 */
export async function verifyReleaseTransaction({ txHash, escrowAddress, milestoneIndex }) {
  if (!txHash) {
    throw new AppError(ErrorCodes.TRANSACTION_NOT_VERIFIED, "txHash is required");
  }
  const res = await waitForSuccessfulTransaction(txHash);
  try {
    if (res.envelopeXdr) {
      const { TransactionBuilder } = await import("@stellar/stellar-sdk");
      const tx = TransactionBuilder.fromXDR(res.envelopeXdr, loadConfig().stellar.networkPassphrase);
      assertExpectedInvocation(tx, {
        escrowAddress,
        functionName: "release",
        expectedArgs: { milestoneIndex: Number(milestoneIndex) },
      });
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn("Release envelope parse soft-fail", { txHash, reason: err.message });
  }
  return { txHash, verifiedOnChain: true };
}
