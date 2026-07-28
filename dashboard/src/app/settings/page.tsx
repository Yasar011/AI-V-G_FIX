"use client";

import { useEffect, useState } from "react";
import {
  getLines, getFloors, getStyles, getCategories,
  saveLines, saveFloors, saveStyles, saveCategories,
  type Style, type Categories,
} from "@/lib/config";

function ListEditor({
  title,
  hint,
  items,
  onSave,
}: {
  title: string;
  hint: string;
  items: string[];
  onSave: (next: string[]) => Promise<void>;
}) {
  const [list, setList] = useState(items);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setList(items), [items]);

  async function commit(next: string[]) {
    setList(next);
    setSaving(true);
    await onSave(next);
    setSaving(false);
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
          <p style={{ color: "var(--text3)", fontSize: 12 }}>{hint}</p>
        </div>
        {saving && <span style={{ fontSize: 11, color: "var(--text3)" }}>saving…</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {list.length === 0 && <span style={{ color: "var(--text3)", fontSize: 13 }}>None yet.</span>}
        {list.map((item) => (
          <span key={item} className="chip">
            {item}
            <button
              onClick={() => commit(list.filter((i) => i !== item))}
              style={{ color: "var(--red)", marginLeft: 4, fontWeight: 700 }}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add new…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              commit([...list, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!draft.trim()}
          onClick={() => {
            commit([...list, draft.trim()]);
            setDraft("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [categories, setCategories] = useState<Categories>({});

  const [styleName, setStyleName] = useState("");
  const [styleCategory, setStyleCategory] = useState("");
  const [catName, setCatName] = useState("");
  const [catViews, setCatViews] = useState("");

  useEffect(() => {
    (async () => {
      setLines(await getLines());
      setFloors(await getFloors());
      setStyles(await getStyles());
      setCategories(await getCategories());
    })();
  }, []);

  async function addStyle() {
    if (!styleName.trim() || !styleCategory) return;
    const next = [...styles, { name: styleName.trim(), category: styleCategory }];
    setStyles(next);
    await saveStyles(next);
    setStyleName("");
  }

  async function removeStyle(name: string) {
    const next = styles.filter((s) => s.name !== name);
    setStyles(next);
    await saveStyles(next);
  }

  async function addCategory() {
    const views = catViews.split(",").map((v) => v.trim()).filter(Boolean);
    if (!catName.trim() || views.length === 0) return;
    const next = { ...categories, [catName.trim()]: views };
    setCategories(next);
    await saveCategories(next);
    setCatName("");
    setCatViews("");
  }

  async function removeCategory(name: string) {
    const next = { ...categories };
    delete next[name];
    setCategories(next);
    await saveCategories(next);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "var(--text2)", fontSize: 13 }}>
        What the capture app offers in its dropdowns, and how many angles each garment type needs
      </p>

      <div className="grid-2">
        <ListEditor title="Lines" hint="Production lines on the floor" items={lines} onSave={async (n) => { setLines(n); await saveLines(n); }} />
        <ListEditor title="Floors" hint="Building floors" items={floors} onSave={async (n) => { setFloors(n); await saveFloors(n); }} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Garment categories</h3>
            <p style={{ color: "var(--text3)", fontSize: 12 }}>
              Which angles get photographed, in order. Shorts might need Front/Side/Back; a panty only Front/Back.
            </p>
          </div>
        </div>

        <div className="table-wrap" style={{ marginBottom: 14 }}>
          <table>
            <thead>
              <tr><th>Category</th><th>Views (in order)</th><th></th></tr>
            </thead>
            <tbody>
              {Object.keys(categories).length === 0 ? (
                <tr><td colSpan={3} style={{ color: "var(--text3)" }}>None yet.</td></tr>
              ) : (
                Object.entries(categories).map(([name, views]) => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{name}</td>
                    <td>{views.map((v, i) => <span key={v} className="chip" style={{ marginRight: 4 }}>{i + 1}. {v}</span>)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => removeCategory(name)}>Remove</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category name</label>
            <input className="form-input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. shorts" />
          </div>
          <div className="form-group">
            <label className="form-label">Views, comma separated</label>
            <input className="form-input" value={catViews} onChange={(e) => setCatViews(e.target.value)} placeholder="Front, Side, Back" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={addCategory} disabled={!catName.trim() || !catViews.trim()}>
          Add category
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Styles</h3>
            <p style={{ color: "var(--text3)", fontSize: 12 }}>
              Each style belongs to a category, which decides how many angles the operator captures.
            </p>
          </div>
        </div>

        <div className="table-wrap" style={{ marginBottom: 14 }}>
          <table>
            <thead>
              <tr><th>Style</th><th>Category</th><th>Views</th><th></th></tr>
            </thead>
            <tbody>
              {styles.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "var(--text3)" }}>None yet.</td></tr>
              ) : (
                styles.map((s) => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.category}</td>
                    <td style={{ color: "var(--text3)" }}>{(categories[s.category] || []).join(" → ") || "—"}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => removeStyle(s.name)}>Remove</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Style name</label>
            <input className="form-input" value={styleName} onChange={(e) => setStyleName(e.target.value)} placeholder="e.g. ST-1004" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={styleCategory} onChange={(e) => setStyleCategory(e.target.value)}>
              <option value="">Select…</option>
              {Object.keys(categories).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={addStyle} disabled={!styleName.trim() || !styleCategory}>
          Add style
        </button>
      </div>
    </div>
  );
}
