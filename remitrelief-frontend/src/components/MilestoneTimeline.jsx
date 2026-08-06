export default function MilestoneTimeline({ milestones = [] }) {
  if (!milestones.length) {
    return <p className="muted">No milestone data available yet.</p>;
  }

  return (
    <ol className="milestone-timeline">
      {milestones.map((m) => {
        const state = m.released ? "released" : m.verified ? "verified" : "pending";
        return (
          <li key={m.index} className={`milestone-item milestone-${state}`}>
            <div className="milestone-marker" aria-hidden="true" />
            <div className="milestone-content">
              <div className="milestone-top">
                <h4>{m.label || `Milestone ${m.index + 1}`}</h4>
                <span className={`status-pill status-${state}`}>{state}</span>
              </div>
              <p>
                Tranche:{" "}
                <strong>
                  $
                  {(m.amountUsd != null
                    ? Number(m.amountUsd)
                    : Number(m.amount) / 1e7
                  ).toLocaleString()}
                </strong>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
