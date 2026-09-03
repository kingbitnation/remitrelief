import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLedger, fetchStats } from "../lib/api";
import { shortenAddress } from "../lib/stellar";

const TYPES = [
  { value: "", label: "All events" },
  { value: "donation", label: "Donations" },
  { value: "verify", label: "Verifications" },
  { value: "release", label: "Releases" },
  { value: "campaign_created", label: "Campaigns created" },
];

export default function Ledger() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [type, setType] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLedger({ limit: 100, type: type || undefined }), fetchStats()])
      .then(([list, s]) => {
        setEvents(list);
        setStats(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Public transparency</p>
          <h1>Relief ledger</h1>
          <p className="hero-copy">
            Donations, verifications, and releases. Events marked{" "}
            <strong>on-chain verified</strong> were confirmed against Soroban. Demo/app events are
            local development records and are not blockchain proof.
          </p>
        </div>
      </section>

      {stats && (
        <div className="stat-grid dashboard-stats">
          <div className="panel compact">
            <p className="stat-label">Donations logged</p>
            <strong>{stats.donationsCount}</strong>
          </div>
          <div className="panel compact">
            <p className="stat-label">Total raised</p>
            <strong>${Number(stats.totalRaised).toLocaleString()}</strong>
          </div>
          <div className="panel compact">
            <p className="stat-label">Released</p>
            <strong>${Number(stats.amountReleased).toLocaleString()}</strong>
          </div>
        </div>
      )}

      <div className="chip-row filter-chips" role="group" aria-label="Event type">
        {TYPES.map((t) => (
          <button
            key={t.value || "all"}
            type="button"
            className={`chip ${type === t.value ? "active" : ""}`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading ledger…</p>}
      {error && <div className="message error">{error}</div>}

      {!loading && !error && (
        <section className="panel">
          {events.length === 0 ? (
            <p className="muted">No events for this filter.</p>
          ) : (
            <ul className="ledger-list">
              {events.map((e) => (
                <li key={e.id} className={`ledger-item ledger-${e.type}`}>
                  <div className="ledger-badge">{e.type.replace("_", " ")}</div>
                  <div className="ledger-body">
                    <h3>
                      <Link to={`/campaigns/${e.campaignId}`}>{e.campaignName}</Link>
                    </h3>
                    <p>{e.note}</p>
                    {e.proofNote && <p className="proof-note">Proof: {e.proofNote}</p>}
                    <div className="ledger-meta">
                      <span
                        className={`status-pill ${
                          e.verifiedOnChain ? "status-released" : "status-pending"
                        }`}
                      >
                        {e.verifiedOnChain ? "on-chain verified" : "demo / app event"}
                      </span>
                      {e.amount != null && <span>${Number(e.amount).toLocaleString()}</span>}
                      {e.actor && <span>{shortenAddress(e.actor, 4)}</span>}
                      {e.txHash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${e.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View tx
                        </a>
                      )}
                      <time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString()}</time>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
