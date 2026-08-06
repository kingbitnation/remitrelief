import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DonateModal from "../components/DonateModal";
import MilestoneTimeline from "../components/MilestoneTimeline";
import { fetchCampaign, fetchLedger } from "../lib/api";
import { shortenAddress } from "../lib/stellar";
import { useToast } from "../context/ToastContext";

export default function CampaignDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [campaign, setCampaign] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [c, ledger] = await Promise.all([
        fetchCampaign(id),
        fetchLedger({ campaignId: id, limit: 30 }),
      ]);
      setCampaign(c);
      setEvents(ledger);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function handleDonationSuccess(_campaignId, donatedAmount) {
    setCampaign((prev) =>
      prev ? { ...prev, raised: Number(prev.raised) + Number(donatedAmount) } : prev
    );
    load();
  }

  async function shareCampaign() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: campaign.name, text: campaign.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.push("Campaign link copied", "success");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.push("Campaign link copied", "success");
    }
  }

  if (loading) return <p className="muted page">Loading campaign…</p>;
  if (error) {
    return (
      <div className="page">
        <div className="message error">{error}</div>
        <Link to="/">← Back to campaigns</Link>
      </div>
    );
  }
  if (!campaign) return null;

  const raisedValue = Number(campaign.raised);
  const pct = Math.min(100, Math.round((raisedValue / campaign.goal) * 100));
  const milestones =
    campaign.milestones ||
    (campaign.milestoneLabels || []).map((m) => ({
      index: m.index,
      label: m.label,
      amountUsd: m.amount,
      verified: m.index < campaign.milestonesVerified,
      released: m.index < campaign.milestonesVerified,
    }));

  return (
    <div className="page campaign-detail">
      <Link className="back-link" to="/">
        ← All campaigns
      </Link>

      <section className="detail-hero" style={{ background: campaign.imageGradient || undefined }}>
        <div className="detail-hero-inner">
          {campaign.category && <span className="category-chip">{campaign.category}</span>}
          <h1>{campaign.name}</h1>
          <p className="detail-location">{campaign.location}</p>
          <p className="detail-desc">{campaign.description}</p>
          <div className="detail-actions">
            <button type="button" onClick={() => setDonateOpen(true)}>
              Donate now
            </button>
            <button type="button" className="ghost-btn" onClick={shareCampaign}>
              Share
            </button>
            <Link className="ghost-link" to="/ledger">
              Public ledger
            </Link>
          </div>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <h2>Funding progress</h2>
          <div className="progress-row">
            <span className="progress-label">{pct}% funded</span>
            <span className="progress-label">
              ${raisedValue.toLocaleString()} / ${Number(campaign.goal).toLocaleString()}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="stat-grid">
            <div>
              <p className="stat-label">Recipient</p>
              <strong>{campaign.recipientName || "Relief partner"}</strong>
            </div>
            <div>
              <p className="stat-label">Milestones</p>
              <strong>
                {campaign.milestonesVerified}/{campaign.milestonesTotal} verified
              </strong>
            </div>
            <div>
              <p className="stat-label">Escrow</p>
              <strong>
                {campaign.escrowAddress
                  ? shortenAddress(campaign.escrowAddress, 6)
                  : "Demo (not deployed)"}
              </strong>
            </div>
            {campaign.onChainBalanceUsd != null && (
              <div>
                <p className="stat-label">On-chain balance</p>
                <strong>${Number(campaign.onChainBalanceUsd).toLocaleString()}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Milestones</h2>
          <MilestoneTimeline milestones={milestones} />
        </section>
      </div>

      <section className="panel">
        <h2>Campaign activity</h2>
        {events.length === 0 ? (
          <p className="muted">No ledger events yet for this campaign.</p>
        ) : (
          <ul className="activity-list">
            {events.map((e) => (
              <li key={e.id}>
                <div>
                  <strong className="event-type">{e.type}</strong>
                  <p>{e.note}</p>
                  {e.proofNote && <p className="proof-note">Proof: {e.proofNote}</p>}
                </div>
                <time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      {donateOpen && (
        <DonateModal
          campaign={campaign}
          onClose={() => setDonateOpen(false)}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
}
