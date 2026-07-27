"use client";

import { useState } from "react";
import Image from "next/image";
import { login, seedDefaultAdmin, type Session } from "@/lib/auth";

export function Login({ onLoggedIn }: { onLoggedIn: (session: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Enter username and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session = await login(username, password);
      onLoggedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeedMsg("Creating...");
    const result = await seedDefaultAdmin();
    if (result) {
      setSeedMsg(`Created — username "${result.username}", password "${result.password}"`);
    } else {
      setSeedMsg("Users already exist — nothing created.");
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, borderRadius: 12 }}>
            <Image src="/logo.png" alt="G-FIX" width={48} height={48} style={{ objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              G-FIX <span style={{ color: "var(--accent)" }}>QC</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>
              Garment Quality Control · Admin
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "var(--red)",
              fontSize: 12,
              marginBottom: 14,
              padding: 12,
              background: "rgba(229,72,77,.08)",
              borderRadius: 8,
              border: "1px solid rgba(229,72,77,.2)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: 12, fontSize: 14 }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
          First time? Create the default admin account below.
        </div>
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={handleSeed} type="button">
            Create Default Admin
          </button>
        </div>
        {seedMsg && (
          <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: "var(--accent)" }}>
            {seedMsg}
          </div>
        )}
      </div>
    </div>
  );
}
