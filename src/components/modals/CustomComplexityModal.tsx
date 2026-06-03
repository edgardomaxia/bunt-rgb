import { useState } from "react";
import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
  initialPar: number;
  onGenerate: (par: number) => void;
};

export function CustomComplexityModal({ open, onClose, initialPar, onGenerate }: Props) {
  const [value, setValue] = useState(initialPar);

  function generate() {
    onGenerate(value);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Custom Complexity">
      <div style={{ opacity: 0.75, fontSize: 13 }}>
        Pick a target PAR for your practice scramble.
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "18px 0 8px" }}>
        <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, opacity: 0.7, fontWeight: 700, letterSpacing: 1 }}>PAR</span>
      </div>

      <input
        type="range"
        min={1}
        max={20}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginTop: 4 }}>
        <span>1</span>
        <span>20</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button
          type="button"
          onClick={generate}
          style={{
            background: "var(--button-active-bg)",
            color: "var(--button-active-fg)",
            border: "none",
            borderRadius: 999,
            padding: "12px 28px",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          GENERATE
        </button>
      </div>
    </ModalShell>
  );
}
