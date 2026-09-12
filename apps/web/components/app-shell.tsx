import Link from "next/link";
import type { ReactNode } from "react";
const nav = [["Home","/"],["Projects","/projects"],["Documents","/documents"],["Quotes","/quotes"],["Rules Engine","/rules-engine"],["CRM","/crm"],["Reports","/reports"],["Administration","/administration"]] as const;
export function AppShell({children}:{children:ReactNode}) {
  return <div className="shell"><aside className="sidebar"><div className="brand"><div className="mark">S</div><div><strong>ScopeLogic</strong><span>Software Alpha</span></div></div><nav>{nav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav><div className="alpha">ALPHA · Isolated commercial build</div></aside><div className="main"><header className="topbar"><div className="search">⌕ <input aria-label="Global search" placeholder="Search projects, quotes, customers..."/></div><div className="user">KJ&nbsp;&nbsp;<strong>Alpha Admin</strong></div></header><main className="content">{children}</main></div></div>;
}
