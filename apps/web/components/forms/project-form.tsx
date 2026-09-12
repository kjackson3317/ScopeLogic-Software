"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerOption = {
  id: string;
  name: string;
};

export function ProjectForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [projectNumber, setProjectNumber] = useState("");
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("estimating");
  const [bidDate, setBidDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNumber,
          name,
          customerId: customerId || null,
          status,
          bidDate: bidDate || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create project.");
        return;
      }

      router.push(`/projects/${result.projectId}`);
      router.refresh();
    } catch {
      setMessage("Unable to create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label>
          Project number
          <input value={projectNumber} onChange={(event) => setProjectNumber(event.target.value)} required />
        </label>

        <label>
          Project name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>

        <label>
          Customer
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">No customer selected</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>{customer.name}</option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="opportunity">Opportunity</option>
            <option value="estimating">Estimating</option>
            <option value="submitted">Submitted</option>
            <option value="pending_award">Pending Award</option>
            <option value="awarded">Awarded</option>
            <option value="active">Active</option>
          </select>
        </label>

        <label>
          Bid date
          <input type="date" value={bidDate} onChange={(event) => setBidDate(event.target.value)} />
        </label>
      </div>

      {message ? <div className="form-message">{message}</div> : null}

      <div className="form-actions">
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Creating..." : "Create Project"}
        </button>
      </div>
    </form>
  );
}
