"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseBluebeamCountCsv, type BluebeamParseResult } from "../../lib/bluebeam/parse-csv";

type RuleInput = { inputKey: string; label: string };
type ExistingInput = { input_key: string; value: number; source_type: string };
type MappedInput = { inputKey: string; label: string; value: number; unit: "EA" };

function match(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function BluebeamImport({
  quoteId, rules, existing, isDraft
}: {
  quoteId: string;
  rules: RuleInput[];
  existing: ExistingInput[];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<BluebeamParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const snapshot = useMemo(() => {
    if (!parsed) return [];
    const grouped = new Map<string, MappedInput>();
    for (const symbol of parsed.symbols) {
      const inputKey = mapping[symbol.subject];
      if (!inputKey) continue;
      const rule = rules.find(r => r.inputKey === inputKey);
      if (!rule) continue;
      const prior = grouped.get(inputKey);
      grouped.set(inputKey, {
        inputKey, label: rule.label, unit: "EA",
        value: (prior?.value ?? 0) + symbol.count
      });
    }
    return Array.from(grouped.values()).sort((a,b) => a.label.localeCompare(b.label));
  }, [parsed, mapping, rules]);

  const previous = new Map(existing.filter(row => row.source_type === "bluebeam")
    .map(row => [row.input_key, Number(row.value)]));
  const incoming = new Set(snapshot.map(row => row.inputKey));
  const removed = Array.from(previous.keys()).filter(key => !incoming.has(key));
  const unmapped = parsed?.symbols.some(symbol => !mapping[symbol.subject]) ?? false;

  async function load(file: File | undefined) {
    setParsed(null); setMapping({}); setApproved(false); setError(""); setSuccess("");
    setFilename(file?.name ?? "");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setError("Choose a Bluebeam CSV summary export."); return; }
    try {
      if (file.size > 2_000_000) throw new Error("Choose a CSV smaller than 2 MB.");
      const result = parseBluebeamCountCsv(await file.text());
      setParsed(result);
      const detected: Record<string,string> = {};
      for (const symbol of result.symbols) {
        const auto = rules.find(rule =>
          match(rule.inputKey) === match(symbol.subject) || match(rule.label) === match(symbol.subject)
        );
        if (auto) detected[symbol.subject] = auto.inputKey;
      }
      setMapping(detected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to parse CSV.");
    }
  }

  async function apply() {
    if (!parsed || unmapped || !snapshot.length || !approved || !isDraft) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/v1/quotes/" + quoteId + "/bluebeam-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, inputs: snapshot })
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Import failed."); return; }
      setSuccess("Bluebeam quantities applied. Run Rules to calculate BOM recommendations.");
      setApproved(false);
      router.refresh();
    } catch {
      setError("Unable to apply this import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Bluebeam connection · CSV mode</p>
          <h2>Import Count Takeoff</h2>
          <p className="page-description">
            Export a CSV Markups List summary from Revu using Markups only,
            with Subject and Count columns. Match Bluebeam Subjects to ScopeLogic rule inputs,
            review quantity changes, then apply.
          </p>
        </div>
      </div>
      <div className="inline-note">
        Only Count Tool measurements are supported in this demonstration. Count must
        be included in the CSV because one markup row can represent a group of multiple
        placements. Other annotation rows with no Count value are ignored.
        Export Markups only (not Markups &amp; Totals) to avoid double-counting.
        Length, area, and volume require a separate measurement mapping.
      </div>
      <div className="inline-data-form">
        <label htmlFor="bluebeam-csv">Bluebeam CSV summary</label>
        <input id="bluebeam-csv" type="file" accept=".csv,text/csv"
          disabled={!isDraft || busy} onChange={event => void load(event.target.files?.[0])} />
      </div>
      {!isDraft && <div className="read-only-banner">Create a draft quote revision before importing.</div>}
      {parsed && (
        <>
          <p className="page-description">
            {filename}: {parsed.markupRows.toLocaleString()} markup rows,
            {parsed.symbols.length} unique Subjects.
            {" Count values validated."}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Bluebeam Subject</th><th className="numeric">Count</th><th>ScopeLogic rule input</th></tr></thead>
              <tbody>
                {parsed.symbols.map(symbol => (
                  <tr key={symbol.subject}>
                    <td><strong>{symbol.subject}</strong></td>
                    <td className="numeric">{symbol.count.toLocaleString()}</td>
                    <td>
                      <select aria-label={"Map " + symbol.subject}
                        value={mapping[symbol.subject] ?? ""}
                        onChange={event => {
                          setMapping(current => ({ ...current, [symbol.subject]: event.target.value }));
                          setApproved(false);
                        }}>
                        <option value="">Choose rule input</option>
                        {rules.map(rule => <option key={rule.inputKey} value={rule.inputKey}>
                          {rule.label} ({rule.inputKey})
                        </option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rules.length === 0 && <p className="inline-error">
            Create at least one Rule before importing quantities.
          </p>}
          <h3>Sync review — quantity changes</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Rule input</th><th className="numeric">Previously imported</th><th className="numeric">New</th><th className="numeric">Change</th></tr></thead>
              <tbody>
                {snapshot.map(row => {
                  const old = previous.get(row.inputKey) ?? 0;
                  return <tr key={row.inputKey}><td>{row.label}</td>
                    <td className="numeric">{old}</td>
                    <td className="numeric">{row.value}</td>
                    <td className="numeric">{row.value - old > 0 ? "+" : ""}{row.value - old}</td>
                  </tr>;
                })}
                {removed.map(key => <tr key={key}>
                  <td>{key} (not in new export)</td>
                  <td className="numeric">{previous.get(key)}</td>
                  <td className="numeric">0</td>
                  <td className="numeric">-{previous.get(key)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="page-description">
            Applying replaces previous Bluebeam quantities for this draft quote version.
            Manual inputs and BOM lines are retained. Bluebeam quantities take precedence
            when a manual input uses the same rule key; rule results must be explicitly reviewed.
          </p>
          <label className="inline-note">
            <input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)}/>
            I reviewed the subject mappings and quantity changes.
          </label>
          {unmapped && <p className="inline-error">Map every Subject before applying.</p>}
          <button type="button" className="primary-button" onClick={() => void apply()}
            disabled={!approved || unmapped || !snapshot.length || busy || !isDraft}>
            {busy ? "Applying..." : "Apply Bluebeam Quantities"}
          </button>
        </>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
