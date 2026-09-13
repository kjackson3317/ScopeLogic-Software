"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: "home" | "projects" | "documents" | "quotes" | "rules" | "crm" | "reports" | "admin";
};

function NavGlyph({ name }: { name: NavItem["icon"] }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  const content = {
    home: <><path {...common} d="M3 10.5 10 4l7 6.5"/><path {...common} d="M5.5 9.5V17h9V9.5"/></>,
    projects: <><path {...common} d="M3.5 6.5h5l1.5 2h6.5V16H3.5z"/><path {...common} d="M3.5 6.5V5h5l1.5 1.5"/></>,
    documents: <><path {...common} d="M5 3.5h6l4 4V16.5H5z"/><path {...common} d="M11 3.5v4h4"/><path {...common} d="M7.5 11h5M7.5 13.5h5"/></>,
    quotes: <><rect {...common} x="4" y="3.5" width="12" height="13" rx="1.5"/><path {...common} d="M7 7h6M7 10h6M7 13h3"/></>,
    rules: <><path {...common} d="M4 5h12M4 10h12M4 15h12"/><circle {...common} cx="8" cy="5" r="1.4"/><circle {...common} cx="12" cy="10" r="1.4"/><circle {...common} cx="7" cy="15" r="1.4"/></>,
    crm: <><circle {...common} cx="7.5" cy="7" r="2.5"/><circle {...common} cx="13.5" cy="8" r="2"/><path {...common} d="M3.5 15.5c.6-2.5 2.1-3.8 4-3.8s3.4 1.3 4 3.8M11 15.5c.4-1.8 1.5-2.8 3-2.8 1.3 0 2.3.7 2.8 2"/></>,
    reports: <><path {...common} d="M4 16V9M9 16V5M14 16v-8"/><path {...common} d="M3 16.5h14"/></>,
    admin: <><circle {...common} cx="10" cy="10" r="2.5"/><path {...common} d="M10 3.2v2M10 14.8v2M3.2 10h2M14.8 10h2M5.2 5.2l1.4 1.4M13.4 13.4l1.4 1.4M14.8 5.2l-1.4 1.4M6.6 13.4l-1.4 1.4"/></>
  }[name];

  return <svg viewBox="0 0 20 20" aria-hidden="true">{content}</svg>;
}

export function SidebarNavigation({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            href={item.href}
            className={`nav-link${active ? " active" : ""}`}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon"><NavGlyph name={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
