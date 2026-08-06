import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "../components/CampaignCard";
import DonateModal from "../components/DonateModal";
import { fetchCampaigns, fetchStats } from "../lib/api";

const CATEGORIES = ["All", "Flood", "Wildfire", "Cyclone", "Earthquake", "Relief"];

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("raised");

  async function load(params = {}) {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([
        fetchCampaigns({ q: params.q ?? q, category: params.category ?? category }),
        fetchStats(),
      ]);
      setCampaigns(list);
      setStats(s);
    } catch (err) {
      console.error(err);
      setError("Unable to load campaigns. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load({ q, category }), q || category !== "All" ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const sorted = useMemo(() => {
    const rows = [...campaigns];
    if (sort === "raised") rows.sort((a, b) => Number(b.raised) - Number(a.raised));
    if (sort === "goal") rows.sort((a, b) => Number(b.goal) - Number(a.goal));
    if (sort === "progress") {
      rows.sort(
        (a, b) => Number(b.raised) / Number(b.goal || 1) - Number(a.raised) / Number(a.goal || 1)
      );
    }
    if (sort === "newest") {
      rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return rows;
  }, [campaigns, sort]);

  function handleDonationSuccess(campaignId, donatedAmount) {
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === campaignId
          ? { ...campaign, raised: Number(campaign.raised) + Number(donatedAmount) }
          : campaign
      )
    );
    setSelected((current) =>
      current && current.id === campaignId
        ? { ...current, raised: Number(current.raised) + Number(donatedAmount) }
        : current
    );
    fetchStats().then(setStats).catch(() => {});
  }

  const totalRaised = stats?.totalRaised ?? campaigns.reduce((sum, c) => sum + Number(c.raised), 0);

  return (
    <div className="page campaign-list">
      <section className="hero-card">
        <div className="hero-copy-block">
          <p className="eyebrow">Community escrow for relief</p>
          <h1>Fund trusted campaigns with milestone-protected donations.</h1>
          <p className="hero-copy">
            RemitRelief connects donors, relief organizers, and verified milestones on the Stellar
            network. Your gift is held in escrow and released only after delivery is confirmed.
          </p>
          <div className="hero-actions">
            <a href="#campaigns">Explore campaigns</a>
            <Link to="/create">Start a campaign</Link>
            <Link to="/ledger">View ledger</Link>
          </div>
        </div>
        <div className="hero-summary">
          <div className="hero-stat-card">
            <span className="stat-label">Total funds secured</span>
            <strong>${Number(totalRaised).toLocaleString()}</strong>
          </div>
          <div className="hero-stat-card">
            <span className="stat-label">Verified payout stages</span>
            <strong>{stats?.milestonesVerified ?? 0}</strong>
          </div>
          <div className="hero-stat-card">
            <span className="stat-label">Campaigns active</span>
            <strong>{stats?.campaignsActive ?? campaigns.length}</strong>
          </div>
          <div className="hero-stat-card hero-note">
            <p>
              ${Number(stats?.amountReleased || 0).toLocaleString()} already released after
              milestone proof. Every payout is gated by verification.
            </p>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <div>
          <h2>Built for transparent impact</h2>
          <p>
            Combine Stellar smart contracts, milestone verification, and a public ledger so donors
            can follow funds from gift to ground delivery.
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Escrow protection</h3>
            <p>Funds stay in contract until each milestone passes verification.</p>
          </div>
          <div className="feature-card">
            <h3>Milestone transparency</h3>
            <p>Follow verified stages and live funding status for every project.</p>
          </div>
          <div className="feature-card">
            <h3>Stellar-native payments</h3>
            <p>Fast, low-cost USDC deposits via Soroban escrow on testnet.</p>
          </div>
        </div>
      </section>

      <section id="campaigns" className="section-block">
        <div className="section-heading row-between">
          <div>
            <h2>Active campaigns</h2>
            <p>Filter by disaster type or search by location.</p>
          </div>
          <Link className="secondary-link" to="/create">
            + Create campaign
          </Link>
        </div>

        <div className="filter-bar">
          <label className="sr-only" htmlFor="campaign-search">
            Search campaigns
          </label>
          <input
            id="campaign-search"
            className="search-input"
            type="search"
            placeholder="Search name, location, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="chip-row" role="group" aria-label="Categories">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="sort-label">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="raised">Most raised</option>
              <option value="progress">% funded</option>
              <option value="goal">Largest goal</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>

        {loading && <p className="muted">Loading campaigns…</p>}
        {error && <div className="message error">{error}</div>}
        {!loading && !error && sorted.length === 0 && (
          <div className="panel empty-panel">
            <p>No campaigns match your filters.</p>
          </div>
        )}
        {!loading && !error && sorted.length > 0 && (
          <div className="grid">
            {sorted.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} onDonate={setSelected} />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <DonateModal
          campaign={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
}
