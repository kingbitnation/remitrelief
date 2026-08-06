import { createContext, useContext, useEffect, useState } from "react";
import { connectWallet as openWalletModal } from "../lib/wallet";
import { shortenAddress } from "../lib/stellar";

const STORAGE_KEY = "remitrelief_donor";
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (address) localStorage.setItem(STORAGE_KEY, address);
    else localStorage.removeItem(STORAGE_KEY);
  }, [address]);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      const pk = await openWalletModal();
      setAddress(pk);
      return pk;
    } catch (err) {
      setError(err.message || "Could not connect wallet");
      throw err;
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setAddress("");
    setError(null);
  }

  async function ensureConnected() {
    if (address) return address;
    return connect();
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        shortAddress: address ? shortenAddress(address, 4) : "",
        connecting,
        error,
        connect,
        disconnect,
        ensureConnected,
        isConnected: Boolean(address),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
