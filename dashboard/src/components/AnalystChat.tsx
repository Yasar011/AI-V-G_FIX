"use client";

import { useEffect, useRef, useState } from "react";
import { useInspections } from "@/hooks/useInspections";
import { ask, EXAMPLE_QUESTIONS, type Answer } from "@/lib/analyst";

interface Turn {
  question: string;
  answer: Answer;
}

/**
 * A short opening sequence, sized to the two seconds it takes the panel to
 * feel like it has arrived. It shows the model waking up over the real
 * record count, so the first thing the user sees is their own data rather
 * than a spinner.
 */
function Intro({ count }: { count: number | null }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 420),
      setTimeout(() => setStep(2), 1050),
      setTimeout(() => setStep(3), 1650),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const lines = [
    "waking up",
    count === null ? "reading your records" : `read ${count} inspection${count === 1 ? "" : "s"}`,
    "ready",
  ];

  return (
    <div className="febo-intro">
      <div className="febo-orb" aria-hidden="true">
        <span className="febo-ring febo-ring-1" />
        <span className="febo-ring febo-ring-2" />
        <span className="febo-core">F</span>
      </div>
      <div className="febo-word">Febo</div>
      <div className="febo-lines">
        {lines.map((l, i) => (
          <div key={l} className={`febo-line${step > i ? " on" : ""}`}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalystChat({ onClose }: { onClose: () => void }) {
  const records = useInspections();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [intro, setIntro] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // two seconds, then the panel is usable — skipped entirely for anyone
  // who has asked not to see motion
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setIntro(false);
      return;
    }
    const t = setTimeout(() => setIntro(false), 2100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  function submit(question: string) {
    const q = question.trim();
    if (!q || !records) return;
    setTurns((t) => [...t, { question: q, answer: ask(q, records) }]);
    setInput("");
  }

  return (
    <aside
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid var(--border)",
        background: "var(--bg2)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Ask Febo</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>
            answers computed from your records
          </div>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {intro && <Intro count={records?.length ?? null} />}

        {!intro && turns.length === 0 && (
          <div>
            <p style={{ fontSize: 12.5, color: "var(--text2)", marginTop: 0 }}>
              I work out answers from the inspection data rather than writing them,
              so the numbers always match the dashboard. Try:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: "flex-start", textAlign: "left" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!intro && turns.map((t, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div
              style={{
                background: "var(--bg3)",
                borderRadius: 8,
                padding: "7px 11px",
                fontSize: 13,
                marginBottom: 8,
                marginLeft: 28,
              }}
            >
              {t.question}
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.55 }}>{t.answer.text}</div>

            {t.answer.rows && (
              <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 6 }}>
                {t.answer.rows.map((r, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "6px 10px",
                      fontSize: 12.5,
                      borderTop: j ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <span style={{ color: "var(--text2)" }}>{r.label}</span>
                    <span style={{ fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            {t.answer.note && (
              <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 8, marginBottom: 0 }}>
                {t.answer.note}
              </p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}
      >
        <input
          className="form-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={records ? "Ask about your data…" : "Loading records…"}
          disabled={!records}
        />
        <button className="btn btn-primary" type="submit" disabled={!records || !input.trim()}>
          Ask
        </button>
      </form>
    </aside>
  );
}
