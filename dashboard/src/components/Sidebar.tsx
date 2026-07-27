"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useInspections } from "@/hooks/useInspections";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/inspections", label: "Inspections", icon: "list" },
  { href: "/review", label: "Review queue", icon: "flag" },
] as const;

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "grid") return (
    <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  );
  if (name === "list") return (
    <svg {...common}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  );
  return (
    <svg {...common}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="3"/></svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const records = useInspections();

  const pendingCount = useMemo(() => {
    if (!records) return 0;
    return records.filter((r) => !r.humanVerified && r.finalDecision !== "pass").length;
  }, [records]);

  return (
    <aside className="w-60 shrink-0 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <Image src="/logo.png" alt="G-FIX QC" width={36} height={36} className="rounded-lg" />
        <div>
          <p className="text-slate-100 font-bold text-sm leading-tight">G-FIX QC</p>
          <p className="text-slate-500 text-[11px]">Inspection system</p>
        </div>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon name={item.icon} />
                {item.label}
              </span>
              {item.href === "/review" && pendingCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live — reading from Firebase
        </div>
      </div>
    </aside>
  );
}
