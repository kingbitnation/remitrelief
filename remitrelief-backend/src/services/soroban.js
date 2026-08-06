import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

const BACKEND_SECRET = process.env.BACKEND_SIGNER_SECRET;

const sorobanServer = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

function backendKeypair() {
  if (!BACKEND_SECRET) {
    throw new Error("BACKEND_SIGNER_SECRET is not set — see .env.example");
  }
  return Keypair.fromSecret(BACKEND_SECRET);
}

async function buildInvocation(sourcePublicKey, contractId, method, args = []) {
  const account = await sorobanServer.getAccount(sourcePublicKey);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await sorobanServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  return { tx: prepared, sim, account };
}

async function invokeAsBackend(contractId, method, args = []) {
  const kp = backendKeypair();
  const { tx, sim } = await buildInvocation(kp.publicKey(), contractId, method, args);
  return { tx, sim, kp };
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
  const { tx, kp } = await invokeAsBackend(escrowAddress, "release", [
    nativeToScVal(milestoneIndex, { type: "u32" }),
  ]);

  tx.sign(kp);

  const sendResult = await sorobanServer.sendTransaction(tx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  return pollTransaction(sendResult.hash);
}

export async function verifyMilestoneOnChain({ verifierSignedXDR }) {
  const tx = TransactionBuilder.fromXDR(verifierSignedXDR, NETWORK_PASSPHRASE);
  const sendResult = await sorobanServer.sendTransaction(tx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }
  return pollTransaction(sendResult.hash);
}

export async function submitSignedSorobanXdr(signedXdr) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await sorobanServer.sendTransaction(tx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }
  return pollTransaction(sendResult.hash);
}

async function pollTransaction(hash, { intervalMs = 1500, timeoutMs = 30000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await sorobanServer.getTransaction(hash);
    if (res.status === "SUCCESS") return { hash, status: res.status };
    if (res.status === "FAILED") {
      throw new Error(`Transaction failed: ${JSON.stringify(res)}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Transaction ${hash} did not settle within ${timeoutMs}ms`);
}
