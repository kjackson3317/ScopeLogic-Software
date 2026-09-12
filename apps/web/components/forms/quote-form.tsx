"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectOption = {
  id: string;
  project_number: string;
  name: string;
};

export function QuoteForm({
  projects,
  defaultProjectId
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [name, setName] = useState("");
  const [tradeScope, setTradeScope] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const response = await fetch("/api/v1/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          quoteNumber,
          name,
          tradeScope: tradeScope || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create quote.");
        return;
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setMessage("Unable to create quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label>
          Project
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.project_number} · {project.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quote number
          <input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} required />
        </label>

        <label>
          Quote name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Fire Alarm" required />
        </label>

        <label>
          Trade / scope
          <input value={tradeScope} onChange={(event) => setTradeScope(event.target.value)} placeholder="Optional" />
        </label>
      </div>

      <div className="inline-note">
        New quotes begin at version <strong>0.0</strong>. The quote number and revision system remain separate.
      </div>

      {message ? <div className="form-message">{message}</div> : null}

      <div className="form-actions">
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Creating..." : "Create Quote"}
        </button>
      </div>
    </form>
  );
}
