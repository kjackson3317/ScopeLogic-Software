/**
 * Bluebeam Revu Markups List CSV adapter.
 *
 * A custom shape markup generally contributes ONE device per markup row.
 * Count Tool measurements contribute their explicit Count quantity instead.
 *
 * The stable identity is the collection of properties Revu exports: Subject,
 * Color, Label, and optional user-configured Shape / Device Code columns.
 * Visual polygon geometry is NOT inferable from a generic CSV "Polygon" Subject.
 */
export type BluebeamSymbol = {
  key: string;
  subject: string;
  color: string;
  label: string;
  shape: string;
  deviceCode: string;
  count: number;
  markups: number;
  countMeasurements: number;
};
export type BluebeamParseResult = {
  symbols: BluebeamSymbol[];
  markupRows: number;
  hasCountColumn: boolean;
  missingSubjects: number;
  hasColorColumn: boolean;
  hasShapeColumn: boolean;
  hasCodeColumn: boolean;
};

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_#-]/g, "");
}

function normalizeColor(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function bluebeamSymbolKey(symbol: Pick<BluebeamSymbol,
  "subject" | "color" | "label" | "shape" | "deviceCode">): string {
  return JSON.stringify([
    symbol.subject.trim().toLowerCase(),
    normalizeColor(symbol.color),
    symbol.label.trim().toLowerCase(),
    symbol.shape.trim().toLowerCase(),
    symbol.deviceCode.trim().toLowerCase()
  ]);
}

function records(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "", current: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      current.push(field); field = "";
    } else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      current.push(field);
      if (current.some(value => value.trim())) rows.push(current);
      field = ""; current = [];
    } else field += c;
  }
  if (quoted) throw new Error("The CSV contains an unfinished quoted field.");
  current.push(field);
  if (current.some(value => value.trim())) rows.push(current);
  return rows;
}

export function parseBluebeamMarkupCsv(text: string): BluebeamParseResult {
  if (!text.trim()) throw new Error("The selected file is empty.");
  if (text.length > 2_000_000) throw new Error("Choose a CSV smaller than 2 MB.");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = ["\t", ",", ";"].sort((a,b) =>
    firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows = records(text.replace(/^\uFEFF/, ""), delimiter);
  if (rows.length < 2) throw new Error("No markup rows were found.");
  const headers = rows[0].map(normalizeHeader);
  const subjectIndex = headers.indexOf("subject");
  const colorIndex = headers.findIndex(h => h === "color" || h === "linecolor");
  const labelIndex = headers.indexOf("label");
  const shapeIndex = headers.findIndex(h => h === "shape" || h === "symbolshape");
  const codeIndex = headers.findIndex(h => h === "devicecode" || h === "symbolcode" || h === "symbolid");
  const countIndex = headers.indexOf("count");
  if (subjectIndex < 0) throw new Error("Include the Subject column in the Revu Markups List CSV Summary.");

  const tally = new Map<string, BluebeamSymbol>();
  let markupRows = 0;
  let missingSubjects = 0;
  for (const row of rows.slice(1)) {
    const subject = (row[subjectIndex] ?? "").trim();
    if (!subject) { missingSubjects++; continue; }
    if (/^(total|totals|grand total)$/i.test(subject)) continue;
    const color = colorIndex < 0 ? "" : normalizeColor(row[colorIndex] ?? "");
    const label = labelIndex < 0 ? "" : (row[labelIndex] ?? "").trim();
    const shape = shapeIndex < 0 ? "" : (row[shapeIndex] ?? "").trim();
    const deviceCode = codeIndex < 0 ? "" : (row[codeIndex] ?? "").trim();
    const rawCount = countIndex < 0 ? "" : (row[countIndex] ?? "").trim();
    let count = 1;
    if (rawCount) {
      count = Number(rawCount.replace(/,/g, ""));
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error("Invalid Count value for markup Subject: " + subject);
      }
    }
    if (count === 0) continue;
    markupRows++;
    if (markupRows > 20000) throw new Error("Limit imports to 20,000 markup rows.");
    const symbol = { subject, color, label, shape, deviceCode };
    const key = bluebeamSymbolKey(symbol);
    const previous = tally.get(key);
    tally.set(key, {
      key, ...symbol,
      count: (previous?.count ?? 0) + count,
      markups: (previous?.markups ?? 0) + 1,
      countMeasurements: (previous?.countMeasurements ?? 0) + (rawCount ? 1 : 0)
    });
  }
  const symbols = Array.from(tally.values()).sort((a,b) =>
    a.subject.localeCompare(b.subject) ||
    a.color.localeCompare(b.color) ||
    a.label.localeCompare(b.label) ||
    a.shape.localeCompare(b.shape)
  );
  if (!symbols.length) throw new Error("No usable markup rows found. Export individual Markups only, not Totals.");
  return {
    symbols, markupRows, missingSubjects,
    hasCountColumn: countIndex >= 0,
    hasColorColumn: colorIndex >= 0,
    hasShapeColumn: shapeIndex >= 0,
    hasCodeColumn: codeIndex >= 0
  };
}
