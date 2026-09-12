import Link from "next/link";

const tabs = [
  ["Estimate", ""],
  ["Quantities", "/quantities"],
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
  active: "estimate" | "quantities" | "scope" | "alternates" | "proposal" | "history";
}) {
  return (
    <nav className="quote-tabs" aria-label="Quote workspace">
      {tabs.map(([label, suffix]) => {
        const key = label.toLowerCase() as typeof active;
        return <Link
          className={key === active ? "quote-tab active" : "quote-tab"}
          href={`/quotes/${quoteId}${suffix}`}
          key={label}
        >{label}</Link>;
      })}
    </nav>
  );
}
