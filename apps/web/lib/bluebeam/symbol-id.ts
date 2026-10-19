/**
 * Proposed ScopeLogic Symbol ID standard.
 * The unique code describes counted scope, not materials, manufacturer or appearance.
 */
export const SCOPELOGIC_SYMBOL_PATTERN = /^[A-Z]{2,5}-[A-Z0-9]{2,12}(?:-[A-Z0-9]{1,12})?$/;
export const SCOPELOGIC_SYSTEM_CODES = [
  "SC", "FA", "ACS", "CCTV", "INTR", "ICOM",
  "AV", "PA", "AOR", "ERRC", "EPH", "OTH"
] as const;

export function normalizeScopeLogicSymbolId(raw: string): string | null {
  const candidate = raw.trim().toUpperCase();
  return SCOPELOGIC_SYMBOL_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Subject is authoritative. Custom Device Code is a fallback only where
 * the markup Subject cannot be changed/exported as a ScopeLogic Symbol ID.
 */
export function getMarkupSymbolId({
  subject, deviceCode
}: { subject: string; deviceCode?: string }): string | null {
  return normalizeScopeLogicSymbolId(subject) ??
    normalizeScopeLogicSymbolId(deviceCode ?? "");
}
