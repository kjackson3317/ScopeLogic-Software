"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateQuoteTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tradeScope, setTradeScope] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/quote-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, tradeScope, defaultMaterialMarkup: 1.2 })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create Quote Template.");
        return;
      }
      router.push(`/quote-templates/${result.templateId}`);
      router.refresh();
    } catch {
      setMessage("Unable to create Quote Template.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel template-create-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Reusable estimating baseline</p>
          <h2>Create Quote Template</h2>
        </div>
      </div>
      <div className="template-create-grid">
        <label>Template Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="EST4 Fire Alarm — Standard" required /></label>
        <label>Trade / System<input value={tradeScope} onChange={(event) => setTradeScope(event.target.value)} placeholder="Optional" /></label>
        <label className="template-description-field">Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe when this template should be used." /></label>
        <button className="primary-button" disabled={busy} type="submit">{busy ? "Creating..." : "Create Template"}</button>
      </div>
      {message ? <div className="form-message template-form-message">{message}</div> : null}
    </form>
  );
}
