export type BluebeamSymbol = { subject: string; count: number; markups: number };
export type BluebeamParseResult = { symbols: BluebeamSymbol[]; markupRows: number; hasCountColumn: boolean };

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_#-]/g, "");
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

export function parseBluebeamCountCsv(text: string): BluebeamParseResult {
  if (!text.trim()) throw new Error("The selected file is empty.");
  if (text.length > 2_000_000) throw new Error("Choose a CSV smaller than 2 MB.");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = ["\t", ",", ";"].sort((a, b) =>
    firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows = records(text.replace(/^\uFEFF/, ""), delimiter);
  if (rows.length < 2) throw new Error("No markup rows were found.");
  const headers = rows[0].map(normalizeHeader);
  const subjectIndex = headers.indexOf("subject");
  const countIndex = headers.findIndex(header => header === "count" || header === "totalcount");
  if (subjectIndex < 0) throw new Error("Bluebeam export must include a Subject column.");
  const tally = new Map<string, BluebeamSymbol>();
  let markupRows = 0;
  for (const row of rows.slice(1)) {
    const subject = (row[subjectIndex] ?? "").trim();
    if (!subject || /^(total|totals|grand total)$/i.test(subject)) continue;
    const rawCount = countIndex >= 0 ? (row[countIndex] ?? "").trim() : "";
    const count = rawCount ? Number(rawCount.replace(/,/g, "")) : 1;
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
      throw new Error("Invalid count for subject: " + subject);
    }
    if (count === 0) continue;
    markupRows++;
    if (markupRows > 20000) throw new Error("Limit imports to 20,000 markup rows.");
    const prior = tally.get(subject);
    tally.set(subject, {
      subject,
      count: (prior?.count ?? 0) + count,
      markups: (prior?.markups ?? 0) + 1
    });
  }
  const symbols = Array.from(tally.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  if (!symbols.length) throw new Error("No nonzero count markups were found.");
  return { symbols, markupRows, hasCountColumn: countIndex >= 0 };
}
