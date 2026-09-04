import {
  StellarWalletsKit,
  WalletNetwork,
  FreighterModule,
  AlbedoModule,
} from "@creit.tech/stellar-wallets-kit";
import { NETWORK_PASSPHRASE } from "./stellar.js";

const NETWORK = (import.meta.env.VITE_STELLAR_NETWORK || "TESTNET").toUpperCase();
const kitNetwork =
  NETWORK === "FUTURENET" ? WalletNetwork.FUTURENET : WalletNetwork.TESTNET;

export const kit = new StellarWalletsKit({
  network: kitNetwork,
  modules: [new FreighterModule(), new AlbedoModule()],
});

export async function connectWallet() {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          resolve(address);
        } catch (err) {
          reject(err);
        }
      },
      onClosed: (err) => {
        if (err) reject(err);
        else reject(new Error("Wallet connection cancelled"));
      },
    });
  });
}

export async function signTransaction(xdr, publicKey) {
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address: publicKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  return signedTxXdr;
}

/**
 * Sign an auth challenge message. Returns base64 signature string.
 */
export async function signMessage(message, publicKey) {
  if (typeof kit.signMessage !== "function") {
    throw new Error("Connected wallet does not support message signing");
  }
  const result = await kit.signMessage(message, { address: publicKey });
  const signature =
    result?.signedMessage ||
    result?.signature ||
    (typeof result === "string" ? result : null);
  if (!signature) {
    throw new Error("Wallet did not return a message signature");
  }
  return signature;
}
