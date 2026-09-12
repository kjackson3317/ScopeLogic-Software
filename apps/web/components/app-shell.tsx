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
  { label: "Home", href: "/", short: "HM" },
  { label: "Projects", href: "/projects", short: "PR" },
  { label: "Documents", href: "/documents", short: "DC" },
  { label: "Quotes", href: "/quotes", short: "QT", module: "quote" },
  { label: "Rules Engine", href: "/rules-engine", short: "RE", module: "rules" },
  { label: "CRM", href: "/crm", short: "CR" },
  { label: "Reports", href: "/reports", short: "RP" },
  { label: "Administration", href: "/administration", short: "AD" }
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
            <span>Software Alpha</span>
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
          <div className="alpha-badge">ALPHA</div>
          <p>{context.organizationName}</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Global search" placeholder="Search projects, quotes, customers..." />
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Help">?</button>
            <button className="icon-button" type="button" aria-label="Notifications">•</button>
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
