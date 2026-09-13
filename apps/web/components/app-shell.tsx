import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAlphaAppContext } from "../lib/auth/app-context";
import { SetupRequired } from "./setup-required";
import { SidebarNavigation } from "./sidebar-navigation";

type NavItem = {
  label: string;
  href: string;
  icon: "home" | "projects" | "documents" | "quotes" | "rules" | "crm" | "reports" | "admin";
  module?: string;
};

const navigation: NavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Projects", href: "/projects", icon: "projects" },
  { label: "Documents", href: "/documents", icon: "documents" },
  { label: "Quotes", href: "/quotes", icon: "quotes", module: "quote" },
  { label: "Rules Engine", href: "/rules-engine", icon: "rules", module: "rules" },
  { label: "CRM", href: "/crm", icon: "crm" },
  { label: "Reports", href: "/reports", icon: "reports" },
  { label: "Administration", href: "/administration", icon: "admin" }
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
          <img
            className="brand-logo"
            src="/brand/scopelogic-software-4c-mark.svg"
            alt="ScopeLogic Software"
          />
          <div>
            <strong>ScopeLogic</strong>
            <span>Software · Alpha</span>
          </div>
        </div>

        <SidebarNavigation items={visibleNavigation} />

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
