import { ref, get, set, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";

export type Role = "Admin" | "Supervisor";

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  line?: string;
  floor?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  username: string;
  name: string;
  role: Role;
  line?: string;
  floor?: string;
}

const SESSION_KEY = "gfixqc_session";

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await get(ref(db, "users"));
  const data = snap.val() || {};
  return Object.entries(data).map(([id, u]) => ({ id, ...(u as Omit<AppUser, "id">) }));
}

export async function login(username: string, password: string): Promise<Session> {
  const users = await getAllUsers();
  const match = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!match) throw new Error("No account with that username");

  const hash = await sha256Hex(password);
  if (hash !== match.passwordHash) throw new Error("Incorrect password");

  const session: Session = {
    id: match.id, username: match.username, name: match.name, role: match.role,
    line: match.line, floor: match.floor,
  };
  setSession(session);
  return session;
}

export async function createUser(
  username: string, password: string, name: string, role: Role,
  line?: string, floor?: string,
) {
  const users = await getAllUsers();
  if (users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    throw new Error("That username is already taken");
  }
  const passwordHash = await sha256Hex(password);
  const newRef = push(ref(db, "users"));
  const user: Omit<AppUser, "id"> = {
    username: username.trim(),
    passwordHash,
    name: name.trim(),
    role,
    line: line || "",
    floor: floor || "",
    createdAt: new Date().toISOString(),
  };
  await set(newRef, user);
  return newRef.key as string;
}

export async function seedDefaultAdmin(): Promise<{ username: string; password: string } | null> {
  const users = await getAllUsers();
  if (users.length > 0) return null;
  const username = "admin";
  const password = "admin123";
  await createUser(username, password, "Administrator", "Admin");
  return { username, password };
}

export async function deleteUser(id: string) {
  await remove(ref(db, `users/${id}`));
}

export async function updateUserRole(id: string, role: Role) {
  await update(ref(db, `users/${id}`), { role });
}

export async function updateUserAssignment(id: string, patch: { line?: string; floor?: string }) {
  await update(ref(db, `users/${id}`), patch);
}
