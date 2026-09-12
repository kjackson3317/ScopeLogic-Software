"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FinalizeVersionButton({
  quoteId,
  version
}: {
  quoteId: string;
  version: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function finalize() {
    if (!window.confirm(`Finalize Quote Version ${version}? It will become read-only until a new revision is created.`)) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/quotes/${quoteId}/finalize`, {
        method: "POST"
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to finalize version.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Unable to finalize version.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="version-action-stack">
      <button className="secondary-button" type="button" onClick={finalize} disabled={busy}>
        {busy ? "Finalizing..." : `Finalize ${version}`}
      </button>
      {message ? <span className="inline-error">{message}</span> : null}
    </div>
  );
}
