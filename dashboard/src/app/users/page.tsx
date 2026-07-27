"use client";

import { useEffect, useState } from "react";
import {
  getAllUsers,
  createUser,
  deleteUser,
  updateUserRole,
  getSession,
  type AppUser,
  type Role,
} from "@/lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Supervisor");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const session = getSession();

  async function refresh() {
    setUsers(await getAllUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || !name.trim()) {
      setError("Fill in all fields");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await createUser(username, password, name, role);
      setUsername("");
      setPassword("");
      setName("");
      setRole("Supervisor");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, uname: string) {
    if (!confirm(`Remove user "${uname}"?`)) return;
    await deleteUser(id);
    await refresh();
  }

  async function handleRoleChange(id: string, newRole: Role) {
    await updateUserRole(id, newRole);
    await refresh();
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>User accounts</h2>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>
            Who can sign in to this dashboard, and what they can see
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add user"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          {error && (
            <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 14 }}>{error}</div>
          )}
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jdoe" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" disabled={saving} type="submit">
              {saving ? "Creating..." : "Create user"}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users === null ? (
                <tr><td colSpan={5} style={{ color: "var(--text3)" }}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ color: "var(--text3)" }}>No users yet.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{u.username}</td>
                    <td>
                      <select
                        className="form-input"
                        style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      >
                        <option value="Supervisor">Supervisor</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ color: "var(--text3)" }}>{u.createdAt?.split("T")[0]}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(u.id, u.username)}
                        disabled={u.id === session?.id}
                        title={u.id === session?.id ? "Can't remove yourself" : "Remove user"}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
