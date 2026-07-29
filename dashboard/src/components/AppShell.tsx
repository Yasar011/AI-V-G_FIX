"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSession, logout, type Session } from "@/lib/auth";
import { Login } from "@/components/Login";
import { Sidebar } from "@/components/Sidebar";
import { AnalystChat } from "@/components/AnalystChat";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/analytics": "Defect analytics",
  "/inspections": "Inspections",
  "/review": "Review queue",
  "/users": "Users",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (session === undefined) return null;

  if (session === null) {
    return <Login onLoggedIn={setSession} />;
  }

  const title = PAGE_TITLES[pathname] || "";

  return (
    <div className="app">
      <Sidebar session={session} />
      <div className="main">
        <div className="topbar">
          <h1 className="page-title">{title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm febo-launch"
              onClick={() => setChatOpen((v) => !v)}
              aria-pressed={chatOpen}
            >
              <span className="febo-dot" aria-hidden="true" />
              Ask Febo
            </button>
            <span className="fb">🔥 Live</span>
            <div className="user-pill">
              <div className="avatar">{session.name.slice(0, 2).toUpperCase()}</div>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{session.name}</div>
                <div style={{ color: "var(--text3)", fontSize: 10 }}>{session.role}</div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout();
                setSession(null);
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
      {chatOpen && <AnalystChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}
