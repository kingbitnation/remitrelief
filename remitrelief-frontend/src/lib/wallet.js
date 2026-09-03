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
