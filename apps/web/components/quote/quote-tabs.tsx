import Link from "next/link";

const tabs = [
  ["Estimate", ""],
  ["Scope", "/scope"],
  ["Alternates", "/alternates"],
  ["Proposal", "/proposal"],
  ["History", "/history"]
] as const;

export function QuoteTabs({
  quoteId,
  active
}: {
  quoteId: string;
  active: "estimate" | "scope" | "alternates" | "proposal" | "history";
}) {
  const activeLabel = active === "estimate"
    ? "Estimate"
    : active.charAt(0).toUpperCase() + active.slice(1);

  return (
    <nav className="quote-tabs" aria-label="Quote workspace">
      {tabs.map(([label, suffix]) => (
        <Link
          className={label === activeLabel ? "quote-tab active" : "quote-tab"}
          href={`/quotes/${quoteId}${suffix}`}
          key={label}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
