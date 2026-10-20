"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseBluebeamMarkupCsv, type BluebeamParseResult } from "../../lib/bluebeam/parse-csv";
import { getMarkupSymbolId } from "../../lib/bluebeam/symbol-id";
import { TakeoffCountTable } from "./takeoff-count-table";

type RuleInput = { inputKey: string; label: string };
type ExistingInput = { input_key: string; value: number; source_type: string };
type SavedMapping = { source_key: string; input_key: string | null; excluded: boolean };
type MappedInput = { inputKey: string; label: string; value: number; unit: "EA" };
const EXCLUDE = "__exclude__";

export function BluebeamImport({
  quoteId, rules, existing, savedMappings, isDraft
}: {
  quoteId: string;
  rules: RuleInput[];
  existing: ExistingInput[];
  savedMappings: SavedMapping[];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<BluebeamParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState(false);
  const [genericVerified, setGenericVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const snapshot = useMemo(() => {
    if (!parsed) return [];
    const grouped = new Map<string, MappedInput>();
    for (const symbol of parsed.symbols) {
      const inputKey = mapping[symbol.key];
      if (!inputKey || inputKey === EXCLUDE) continue;
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
  const unmapped = parsed?.symbols.some(symbol => !mapping[symbol.key]) ?? false;
  const genericPolygons = parsed?.symbols.filter(s =>
    /^(polygon|polyline)$/i.test(s.subject) && !getMarkupSymbolId(s) &&
    !s.label && !s.shape && !s.deviceCode
  ) ?? [];
  const excludedSymbols = parsed?.symbols.filter(s => mapping[s.key] === EXCLUDE) ?? [];
  const invalidCodes = parsed?.symbols.filter(s =>
    !getMarkupSymbolId(s) && mapping[s.key] !== EXCLUDE
  ) ?? [];

  async function load(file: File | undefined) {
    setParsed(null); setMapping({}); setApproved(false); setGenericVerified(false); setError(""); setSuccess("");
    setFilename(file?.name ?? "");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setError("Choose a Revu Markups List CSV summary."); return; }
    try {
      if (file.size > 2_000_000) throw new Error("Choose a CSV smaller than 2 MB.");
      const result = parseBluebeamMarkupCsv(await file.text());
      setParsed(result);
      const saved = new Map(savedMappings.map(m => [m.source_key, m]));
      const detected: Record<string,string> = {};
      for (const symbol of result.symbols) {
        const prior = saved.get(symbol.key);
        if (prior) {
          if (prior.excluded) { detected[symbol.key] = EXCLUDE; continue; }
          if (prior.input_key && rules.some(r => r.inputKey === prior.input_key)) {
            detected[symbol.key] = prior.input_key;
            continue;
          }
        }
        // A properly named ScopeLogic Subject resolves without color/shape guesswork.
        const symbolId = getMarkupSymbolId(symbol);
        const auto = symbolId && rules.find(rule => rule.inputKey.toUpperCase() === symbolId);
        if (auto) detected[symbol.key] = auto.inputKey;
      }
      setMapping(detected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to parse CSV.");
    }
  }

  async function apply() {
    if (!parsed || unmapped || !snapshot.length || !approved || !isDraft || !parsed.hasColorColumn || (genericPolygons.length > 0 && !genericVerified)) return;
    setBusy(true); setError(""); setSuccess("");
    const mappings = parsed.symbols.map(symbol => ({
      sourceKey: symbol.key, subject: symbol.subject, color: symbol.color,
      label: symbol.label, shape: symbol.shape, deviceCode: symbol.deviceCode,
      excluded: mapping[symbol.key] === EXCLUDE,
      inputKey: mapping[symbol.key] === EXCLUDE ? "" : mapping[symbol.key]
    }));
    try {
      const response = await fetch("/api/v1/quotes/" + quoteId + "/bluebeam-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, inputs: snapshot, mappings })
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Import failed."); return; }
      setSuccess("Bluebeam quantities applied. Mappings saved for later imports. Run Rules, then review BOM recommendations.");
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
          <p className="section-kicker">Local Bluebeam Revu · CSV</p>
          <h2>Import Custom Symbol Takeoff</h2>
          <p className="page-description">
            Export a Markups List CSV Summary of individual markups from Revu.
            Use the permanent Symbol ID in the Subject property.
            Show only the shape on the PDF; turn off Show Caption in Revu.
            Export Subject and Count (when used), with Color and optional custom fields.
          </p>
        </div>
      </div>
      <div className="inline-note">
        Name each new Tool Chest symbol by placing its permanent ScopeLogic ID
        (for example SC-DATA-2P) in its Subject property, not as drawing text.
        Symbol details and totals belong in the bottom count table.
        Ordinary custom shape markups count as one device per markup row.
        Actual Count Tool entries use their numeric Count measurement, when present.
        Shape and color alone may not distinguish two different polygon designs:
        use a unique Subject, Label or Device Code if the exported properties collide.
        Select Markups only (not Totals), and explicitly exclude unrelated annotations.
      </div>
      <div className="inline-data-form">
        <label htmlFor="bluebeam-csv">Local Bluebeam CSV export</label>
        <input id="bluebeam-csv" type="file" accept=".csv,text/csv"
          disabled={!isDraft || busy} onChange={event => void load(event.target.files?.[0])} />
      </div>
      {!isDraft && <div className="read-only-banner">Create a draft quote revision before importing.</div>}
      {parsed && (
        <>
          <p className="page-description">
            {filename}: {parsed.markupRows.toLocaleString()} markup rows,
            {" "}{parsed.symbols.length} distinct exported symbol signatures.
            {parsed.hasCountColumn ? " Count measurement supported." : " No Count column — one per markup row."}
          </p>
          {!parsed.hasColorColumn && <p className="inline-error">
            Color was not exported. For your shape-and-color takeoff method,
            include the Color column before applying any quantities.
          </p>}
          {parsed.missingSubjects > 0 && <p className="inline-error">
            {parsed.missingSubjects} rows had no Subject and were not counted. Inspect the source export.
          </p>}
          {invalidCodes.length > 0 && <p className="inline-error">
            {invalidCodes.length} non-excluded symbol signatures do not have a standard
            ScopeLogic ID in Subject or Device Code. They require manual mapping;
            update the new Tool Chest library to use SYSTEM-DEVICE[-VARIANT] in Subject.
          </p>}
          {genericPolygons.length > 0 && <p className="inline-error">
            {genericPolygons.length} polygon signature(s) have no unique Label, Shape or Device Code.
            Triangle and diamond markups may be indistinguishable in this CSV if they
            share a color and generic Polygon Subject. Verify every assignment;
            add unique metadata in Revu when needed.
          </p>}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ScopeLogic Symbol ID / Shape</th><th>Line color</th><th>Label / device code</th>
                  <th className="numeric">Qty</th><th>ScopeLogic rule input</th>
                </tr>
              </thead>
              <tbody>
                {parsed.symbols.map(symbol => (
                  <tr key={symbol.key}>
                    <td><strong>{getMarkupSymbolId(symbol) ?? symbol.subject}</strong>
                      {symbol.shape ? <small> · {symbol.shape}</small> : null}</td>
                    <td>{symbol.color || "—"}</td>
                    <td>{[symbol.label,symbol.deviceCode].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="numeric">{symbol.count.toLocaleString()}</td>
                    <td>
                      <select aria-label={"Map " + symbol.subject + " " + symbol.color}
                        value={mapping[symbol.key] ?? ""}
                        onChange={event => {
                          setMapping(current => ({ ...current, [symbol.key]: event.target.value }));
                          setApproved(false);
                        }}>
                        <option value="">Select a rule input</option>
                        <option value={EXCLUDE}>Exclude — not a takeoff symbol</option>
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
          <p className="page-description">
            Excluded: {excludedSymbols.length} symbol signature(s),
            {" "}{excludedSymbols.reduce((sum,s) => sum + s.count,0)} markup quantities.
            Exclusions and mappings are saved per organization when applied.
          </p>
          <h3>Quantity changes to apply</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Rule input</th><th className="numeric">Previously imported</th>
                  <th className="numeric">New</th><th className="numeric">Change</th></tr>
              </thead>
              <tbody>
                {snapshot.map(row => {
                  const old = previous.get(row.inputKey) ?? 0;
                  return <tr key={row.inputKey}>
                    <td>{row.label}</td><td className="numeric">{old}</td>
                    <td className="numeric">{row.value}</td>
                    <td className="numeric">{row.value - old > 0 ? "+" : ""}{row.value - old}</td>
                  </tr>;
                })}
                {removed.map(key => <tr key={key}>
                  <td>{key} (not in new import)</td><td className="numeric">{previous.get(key)}</td>
                  <td className="numeric">0</td><td className="numeric">-{previous.get(key)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <TakeoffCountTable symbols={parsed.symbols} mapping={mapping}
            rules={rules} excludedValue={EXCLUDE} />
          <p className="page-description">
            Importing replaces prior Bluebeam quantities on this draft quote version.
            Manual input and existing BOM lines stay intact. After reimport,
            click Run Rules and explicitly accept updated BOM recommendations.
          </p>
          {genericPolygons.length > 0 && <label className="inline-note">
            <input type="checkbox" checked={genericVerified}
              onChange={event => setGenericVerified(event.target.checked)} />
            I verified that each generic Polygon / Color signature represents only one
            device type in this file. If not, add a unique Subject, Label or Device Code
            in Revu before importing.
          </label>}
          <label className="inline-note">
            <input type="checkbox" checked={approved}
              onChange={event => setApproved(event.target.checked)} />
            I reviewed all symbol mappings, exclusions and quantity changes.
          </label>
          {unmapped && <p className="inline-error">Assign or exclude every exported signature before applying.</p>}
          <button type="button" className="primary-button" onClick={() => void apply()}
            disabled={!approved || unmapped || !snapshot.length || busy || !isDraft || !parsed.hasColorColumn || (genericPolygons.length > 0 && !genericVerified)}>
            {busy ? "Applying..." : "Apply Bluebeam Quantities"}
          </button>
        </>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
