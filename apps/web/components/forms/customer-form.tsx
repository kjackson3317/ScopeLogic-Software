"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create customer.");
        return;
      }

      router.push("/crm/customers");
      router.refresh();
    } catch {
      setMessage("Unable to create customer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="field-grid single-column">
        <label>
          Customer name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
      </div>

      {message ? <div className="form-message">{message}</div> : null}

      <div className="form-actions">
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Creating..." : "Create Customer"}
        </button>
      </div>
    </form>
  );
}
