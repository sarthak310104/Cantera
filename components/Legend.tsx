"use client";

const ITEMS: { swatch: React.CSSProperties; label: string }[] = [
  { swatch: { background: "var(--garnet)", borderRadius: "50%" }, label: "Manager / Person" },
  { swatch: { background: "var(--panel-hover)", borderRadius: "50%" }, label: "Club" },
  { swatch: { background: "rgba(244,241,232,0.15)", borderRadius: "50%" }, label: "Tactic" },
];

const LINES: { style: React.CSSProperties; label: string }[] = [
  { style: { borderTop: "2px solid var(--gold)" }, label: "Coached (arrow: coach → protege)" },
  { style: { borderTop: "1px dashed var(--chalk-muted)" }, label: "Managed at / Assistant to" },
  { style: { borderTop: "1px dashed var(--rival)" }, label: "Rivalry" },
];

export function Legend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 18px",
        fontSize: 11,
        color: "var(--chalk-muted)",
        marginTop: 10,
        alignItems: "center",
      }}
    >
      {ITEMS.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, display: "inline-block", ...item.swatch }} />
          {item.label}
        </span>
      ))}
      {LINES.map((line, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 18, display: "inline-block", ...line.style }} />
          {line.label}
        </span>
      ))}
    </div>
  );
}