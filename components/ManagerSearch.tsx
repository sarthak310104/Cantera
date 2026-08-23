"use client";

import { useMemo, useState } from "react";
import type { ManagerSummary } from "@/lib/queries";

type Props = {
  managers: ManagerSummary[];
  onSelect: (managerId: string) => void;
};

export function ManagerSearch({ managers, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return managers.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, managers]);

  return (
    <div style={{ position: "relative", width: 280 }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Find a manager…"
        aria-label="Search for a manager"
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          color: "var(--chalk)",
          fontSize: 14,
        }}
      />
      {open && matches.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--panel)",
            border: "1px solid var(--border-strong)",
            borderRadius: 4,
            zIndex: 10,
          }}
        >
          {matches.map((m) => (
            <li key={m.id}>
              <button
                onMouseDown={() => {
                  onSelect(m.id);
                  setQuery(m.name);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  color: "var(--chalk)",
                  fontSize: 14,
                  cursor: "pointer",
                  borderRadius: 3,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {m.name}
                <span style={{ color: "var(--chalk-muted)", fontSize: 12, marginLeft: 6 }}>
                  {m.clubCount} club{m.clubCount === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}