"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useInspections } from "@/hooks/useInspections";
import type { Session } from "@/lib/auth";

const NAV: { section: string; items: { href: string; label: string; icon: string; adminOnly?: boolean }[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: "grid" },
      { href: "/review", label: "Review queue", icon: "flag" },
    ],
  },
  {
    section: "Data",
    items: [{ href: "/inspections", label: "Inspections", icon: "list" }],
  },
  {
    section: "Config",
    items: [{ href: "/users", label: "Users", icon: "users", adminOnly: true }],
  },
];

function Icon({ name }: { name: string }) {
  const common = { className: "nav-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "grid") return (
    <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  );
  if (name === "list") return (
    <svg {...common}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  );
  if (name === "users") return (
    <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
  return (
    <svg {...common}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="3"/></svg>
  );
}

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const records = useInspections();

  const pendingCount = useMemo(() => {
    if (!records) return 0;
    return records.filter((r) => !r.humanVerified && r.finalDecision !== "pass").length;
  }, [records]);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <Image src="/logo.png" alt="G-FIX QC" width={34} height={34} style={{ objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>G-FIX QC</div>
          <div style={{ fontSize: 10, color: "var(--text3)" }}>Inspection system</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-sec">{group.section}</div>
            {group.items
              .filter((item) => !item.adminOnly || session.role === "Admin")
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
                    <Icon name={item.icon} />
                    {item.label}
                    {item.href === "/review" && pendingCount > 0 && (
                      <span className="nav-badge">{pendingCount}</span>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="avatar">{session.name.slice(0, 2).toUpperCase()}</div>
          <div style={{ fontSize: 12, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.name}
            </div>
            <div style={{ color: "var(--text3)", fontSize: 10 }}>{session.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
