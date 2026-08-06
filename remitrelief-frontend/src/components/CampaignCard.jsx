import { Link } from "react-router-dom";

export default function CampaignCard({ campaign, onDonate }) {
  const { id, name, location, raised, goal, milestonesVerified, milestonesTotal, category, imageGradient } =
    campaign;
  const raisedValue = Number(raised);
  const pct = Math.min(100, Math.round((raisedValue / goal) * 100));
  const remaining = Math.max(0, goal - raisedValue);

  return (
    <article className="campaign-card">
      <div className="campaign-visual" style={{ background: imageGradient || undefined }} aria-hidden="true">
        {category && <span className="category-chip">{category}</span>}
      </div>
      <div className="campaign-body">
        <div className="campaign-header">
          <div>
            <p className="eyebrow">Campaign</p>
            <h3>
              <Link to={`/campaigns/${id}`}>{name}</Link>
            </h3>
          </div>
          <span className="badge">
            {milestonesVerified}/{milestonesTotal} verified
          </span>
        </div>
        <p className="location">{location}</p>

        <div className="progress-row">
          <span className="progress-label">{pct}% funded</span>
          <span className="progress-label">${remaining.toLocaleString()} left</span>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="card-row">
          <div>
            <p className="stat-label">Raised</p>
            <strong>${raisedValue.toLocaleString()}</strong>
          </div>
          <div>
            <p className="stat-label">Goal</p>
            <strong>${goal.toLocaleString()}</strong>
          </div>
        </div>

        <div className="card-actions">
          <Link className="secondary-link" to={`/campaigns/${id}`}>
            View details
          </Link>
          <button type="button" onClick={() => onDonate(campaign)}>
            Donate
          </button>
        </div>
      </div>
    </article>
  );
}
