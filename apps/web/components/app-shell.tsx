import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAlphaAppContext } from "../lib/auth/app-context";
import { SetupRequired } from "./setup-required";

type NavItem = {
  label: string;
  href: string;
  short: string;
  module?: string;
};

const navigation: NavItem[] = [
  { label: "Quote Builder", href: "/quotes", short: "QB", module: "quote" },
  { label: "Parts Database", href: "/administration/catalog", short: "PD" },
  { label: "Rule Engine", href: "/rules-engine", short: "RE", module: "rules" }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const context = await getAlphaAppContext();

  if (context.state === "unconfigured") {
    return <SetupRequired />;
  }

  if (context.state === "unauthenticated") {
    redirect("/login");
  }

  if (context.state === "needs_organization") {
    redirect("/onboarding");
  }

  const initials = context.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SL";

  const visibleNavigation = navigation.filter(
    (item) => !item.module || context.enabledModules.includes(item.module)
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-label="ScopeLogic temporary logo mark">S</div>
          <div>
            <strong>ScopeLogic</strong>
            <span>Quote Builder Demo</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleNavigation.map((item) => (
            <Link href={item.href} className="nav-link" key={item.href}>
              <span className="nav-icon" aria-hidden="true">{item.short}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="alpha-badge">DEMO / TEST</div>
          <p>{context.organizationName}</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="account-button" type="button">
              <span className="avatar">{initials}</span>
              <span>
                <strong>{context.displayName}</strong>
                <small>{context.organizationName} · {context.roleName}</small>
              </span>
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
