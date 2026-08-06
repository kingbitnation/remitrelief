import { NavLink, Outlet } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";

export default function Layout() {
  const { address, shortAddress, connecting, connect, disconnect, isConnected } = useWallet();
  const toast = useToast();

  async function handleConnect() {
    try {
      await connect();
      toast.push("Wallet connected", "success");
    } catch (err) {
      if (!String(err.message || "").includes("cancelled")) {
        toast.push(err.message || "Connection failed", "error");
      }
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">RemitRelief</span>
        </NavLink>
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" end>
            Campaigns
          </NavLink>
          <NavLink to="/create">Create</NavLink>
          <NavLink to="/ledger">Ledger</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/verify">Verify</NavLink>
        </nav>
        <div className="header-wallet">
          {isConnected ? (
            <>
              <span className="wallet-chip" title={address}>
                {shortAddress}
              </span>
              <button type="button" className="secondary compact" onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button type="button" className="compact" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Milestone-escrowed disaster relief on Stellar testnet.</p>
      </footer>
    </div>
  );
}
