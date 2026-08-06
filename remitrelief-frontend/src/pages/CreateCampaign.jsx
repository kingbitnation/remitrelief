import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCampaign } from "../lib/api";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";

const EMPTY_MILESTONE = { label: "", amount: "" };

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { address, ensureConnected } = useWallet();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    category: "Flood",
    goal: "",
    recipientName: "",
  });
  const [milestones, setMilestones] = useState([
    { label: "Initial deployment", amount: "5000" },
    { label: "Mid-point delivery", amount: "5000" },
  ]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMilestone(index, key, value) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, { ...EMPTY_MILESTONE }]);
  }

  function removeMilestone(index) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  const milestoneTotal = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.location.trim() || !Number(form.goal)) {
      setError("Name, location, and goal are required.");
      return;
    }
    if (!milestones.some((m) => m.label && Number(m.amount) > 0)) {
      setError("Add at least one milestone with a label and amount.");
      return;
    }

    try {
      setStatus("submitting");
      let createdBy = address;
      try {
        createdBy = await ensureConnected();
      } catch {
        // Allow anonymous create for demo
        createdBy = null;
      }

      const campaign = await createCampaign({
        ...form,
        goal: Number(form.goal),
        milestones: milestones.filter((m) => m.label && Number(m.amount) > 0),
        createdBy,
      });

      toast.push(`Campaign “${campaign.name}” created`, "success");
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Could not create campaign");
      toast.push("Create failed", "error");
    }
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Organizers</p>
          <h1>Create a relief campaign</h1>
          <p className="hero-copy">
            Define the goal, recipient, and milestone tranches. Donations escrow until each stage is
            verified.
          </p>
        </div>
      </section>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="input-label">
            Campaign name
            <input
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Coastal Flood Response"
            />
          </label>
          <label className="input-label">
            Location
            <input
              required
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="City, Country"
            />
          </label>
          <label className="input-label">
            Category
            <select value={form.category} onChange={(e) => updateField("category", e.target.value)}>
              <option>Flood</option>
              <option>Wildfire</option>
              <option>Cyclone</option>
              <option>Earthquake</option>
              <option>Drought</option>
              <option>Relief</option>
            </select>
          </label>
          <label className="input-label">
            Funding goal (USD)
            <input
              required
              type="number"
              min="1"
              value={form.goal}
              onChange={(e) => updateField("goal", e.target.value)}
            />
          </label>
          <label className="input-label full">
            Recipient organization
            <input
              value={form.recipientName}
              onChange={(e) => updateField("recipientName", e.target.value)}
              placeholder="Local NGO or mutual-aid group"
            />
          </label>
          <label className="input-label full">
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="What will this campaign deliver?"
            />
          </label>
        </div>

        <div className="milestones-editor">
          <div className="row-between">
            <h2>Milestone tranches</h2>
            <button type="button" className="secondary compact" onClick={addMilestone}>
              Add milestone
            </button>
          </div>
          <p className="muted">
            Milestone total: <strong>${milestoneTotal.toLocaleString()}</strong>
            {form.goal && (
              <>
                {" "}
                / goal ${Number(form.goal).toLocaleString()}
                {milestoneTotal !== Number(form.goal) && (
                  <span className="warn-inline"> — totals do not match yet</span>
                )}
              </>
            )}
          </p>

          {milestones.map((m, index) => (
            <div key={index} className="milestone-row">
              <label className="input-label grow">
                Label
                <input
                  value={m.label}
                  onChange={(e) => updateMilestone(index, "label", e.target.value)}
                  placeholder={`Milestone ${index + 1}`}
                />
              </label>
              <label className="input-label amount-field">
                Amount
                <input
                  type="number"
                  min="1"
                  value={m.amount}
                  onChange={(e) => updateMilestone(index, "amount", e.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary compact"
                onClick={() => removeMilestone(index)}
                disabled={milestones.length <= 1}
                aria-label="Remove milestone"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {error && <div className="message error">{error}</div>}

        <div className="modal-actions">
          <button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Creating…" : "Publish campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
