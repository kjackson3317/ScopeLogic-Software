"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SectionForm({
  quoteId,
  disabled
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/quotes/${quoteId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to add section.");
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setMessage("Unable to add section.");
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return null;
  }

  return (
    <form className="inline-section-form" onSubmit={submit}>
      <input
        aria-label="Section name"
        placeholder="New section name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <button className="secondary-button" type="submit" disabled={busy}>
        {busy ? "Adding..." : "Add Section"}
      </button>
      {message ? <span className="inline-error">{message}</span> : null}
    </form>
  );
}
