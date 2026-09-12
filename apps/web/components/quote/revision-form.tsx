"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RevisionForm({
  quoteId,
  currentVersion
}: {
  quoteId: string;
  currentVersion: string;
}) {
  const router = useRouter();
  const [revisionType, setRevisionType] = useState("regular");
  const [reason, setReason] = useState("Addendum");
  const [notes, setNotes] = useState("");
  const [pricingAction, setPricingAction] = useState("keep_previous");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/quotes/${quoteId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisionType,
          reason,
          notes: notes || null,
          pricingAction
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create revision.");
        return;
      }

      router.push(`/quotes/${quoteId}`);
      router.refresh();
    } catch {
      setMessage("Unable to create revision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel revision-form" onSubmit={submit}>
      <div className="revision-intro">
        <p className="section-kicker">Current Version</p>
        <h2>{currentVersion}</h2>
      </div>

      <div className="field-grid">
        <label>
          Revision type
          <select value={revisionType} onChange={(event) => setRevisionType(event.target.value)}>
            <option value="regular">Regular Revision</option>
            <option value="change_order">Change Order</option>
          </select>
        </label>

        <label>
          Reason
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option>Addendum</option>
            <option>Customer Request</option>
            <option>Negotiation</option>
            <option>Value Engineering</option>
            <option>Scope Change</option>
            <option>Pricing Update</option>
            <option>Quantity Change</option>
            <option>Design Change</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Pricing behavior
          <select value={pricingAction} onChange={(event) => setPricingAction(event.target.value)}>
            <option value="keep_previous">Keep Previous Pricing</option>
            <option value="review_changes">Review Changes (Batch 5)</option>
            <option value="update_current">Update Current Pricing (Batch 5)</option>
          </select>
        </label>

        <label className="span-2">
          Revision notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
        </label>
      </div>

      <div className="inline-note">
        A new revision copies the current estimate into a new editable version. The current version remains preserved.
      </div>

      {message ? <div className="form-message">{message}</div> : null}

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Creating revision..." : "Create Revision"}
        </button>
      </div>
    </form>
  );
}
