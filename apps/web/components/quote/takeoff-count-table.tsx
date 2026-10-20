"use client";

import type { BluebeamSymbol } from "../../lib/bluebeam/parse-csv";

type RuleInput = { inputKey: string; label: string };

type Props = {
  symbols: BluebeamSymbol[];
  mapping: Record<string, string>;
  rules: RuleInput[];
  excludedValue: string;
};

function systemCode(code: string): string {
  const index = code.indexOf("-");
  return index < 0 ? "UNASSIGNED" : code.slice(0, index);
}

function SymbolSwatch({symbol}: {symbol: BluebeamSymbol}) {
  const color = /^(#[A-F0-9]{3,8}|rgb\(\d+,\s*\d+,\s*\d+\))$/i.test(symbol.color)
    ? symbol.color : "#64748B";
  const name = symbol.shape.toLowerCase();
  let visual: React.ReactNode;
  if (name === "circle" || name === "ellipse") {
    visual = <circle cx="12" cy="12" r="8" fill={color}/>;
  } else if (name === "square" || name === "rectangle") {
    visual = <rect x="4" y="4" width="16" height="16" fill={color}/>;
  } else if (name === "triangle") {
    visual = <path d="M12 3L22 21H2Z" fill={color}/>;
  } else if (name === "diamond") {
    visual = <path d="M12 2L22 12L12 22L2 12Z" fill={color}/>;
  } else {
    // CSV does not always expose the actual graphic shape.
    // Show color alone rather than present a guessed symbol.
    visual = <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="4"/>;
  }
  return <svg width="24" height="24" viewBox="0 0 24 24"
    role="img" aria-label={symbol.shape ? symbol.shape + " markup swatch" : "Color swatch — shape not available from CSV"}>
    {visual}
  </svg>;
}

export function TakeoffCountTable({symbols, mapping, rules, excludedValue}: Props) {
  // The table totals by stable ScopeLogic ID, not by color or CSV row.
  // Multiple appearance signatures for the same ID contribute to ONE count row.
  const byCode = new Map<string, {
    key: string; code: string; system: string; description: string;
    symbol: BluebeamSymbol; count: number; mixedAppearance: boolean;
  }>();
  for (const symbol of symbols) {
    const ruleKey = mapping[symbol.key];
    if (!ruleKey || ruleKey === excludedValue) continue;
    const rule = rules.find(r => r.inputKey === ruleKey);
    if (!rule) continue;
    const code = rule.inputKey;
    const prior = byCode.get(code);
    const mixedAppearance = Boolean(prior && (
      prior.symbol.shape !== symbol.shape ||
      prior.symbol.color !== symbol.color
    ));
    byCode.set(code, {
      key: code, code, system: systemCode(code), description: rule.label,
      symbol: prior?.symbol ?? symbol, count: (prior?.count ?? 0) + symbol.count,
      mixedAppearance: (prior?.mixedAppearance ?? false) || mixedAppearance
    });
  }
  const records = Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));

  const groups = new Map<string, typeof records>();
  for (const record of records) {
    const list = groups.get(record.system) ?? [];
    list.push(record);
    groups.set(record.system, list);
  }

  return <section className="panel" aria-label="Takeoff count table">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Bottom count summary</p>
        <h3>Symbol Count Table</h3>
        <p className="page-description">
          The drawing shows shapes only. Symbol IDs and descriptions belong here,
          not as text beside the symbols on the PDF.
        </p>
      </div>
    </div>
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>
          <th>Symbol</th><th>Symbol ID</th><th>Description</th>
          <th className="numeric">Count</th><th>Unit</th>
        </tr></thead>
        <tbody>
          {Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([group, values]) => (
            <FragmentRow key={group} system={group} values={values} />
          ))}
          {records.length === 0 && <tr><td colSpan={5} className="table-empty">
            Map your imported symbols to assembly keys to view their count summary.
          </td></tr>}
        </tbody>
        {records.length > 0 && <tfoot><tr>
          <th colSpan={3}>Total locations (all mapped symbol types)</th>
          <th className="numeric">{records.reduce((n, row) => n + row.count, 0).toLocaleString()}</th>
          <th>EA</th>
        </tr></tfoot>}
      </table>
    </div>
    <p className="page-description">
      Shape swatches are accurate only when exported Shape metadata is available.
      When it is missing, the circle outline is a color indicator, not an inferred device icon.
      A future ScopeLogic symbol registry will supply the actual graphic for every code.
    </p>
  </section>;
}

function FragmentRow({system, values}: {
  system: string;
  values: Array<{
    key: string; code: string; description: string;
    symbol: BluebeamSymbol; count: number; mixedAppearance: boolean;
  }>;
}) {
  return <>
    <tr><th colSpan={5}>{system}</th></tr>
    {values.map(record => <tr key={record.key}>
      <td>{record.mixedAppearance ? "Mixed" : <SymbolSwatch symbol={record.symbol}/>}</td>
      <td className="mono">{record.code}</td>
      <td>{record.description}</td>
      <td className="numeric">{record.count.toLocaleString()}</td>
      <td>EA</td>
    </tr>)}
  </>;
}
