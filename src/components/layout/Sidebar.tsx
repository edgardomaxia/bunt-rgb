import type { ReactNode } from "react";
import { HintIcon, PastScramblesIcon } from "../icons/Icons";

type SideButtonProps = {
  onClick?: () => void;
  label: string;
  icon: ReactNode;
};

function SideButton({ onClick, label, icon }: SideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        color: "var(--fg)",
        background: "transparent",
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          border: "2px solid var(--fg)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          textAlign: "center",
          lineHeight: 1.1,
          whiteSpace: "pre-line",
        }}
      >
        {label}
      </span>
    </button>
  );
}

type Props = {
  onHint?: () => void;
  onPastScrambles?: () => void;
};

export function Sidebar({ onHint, onPastScrambles }: Props) {
  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: "center",
      }}
    >
      <SideButton onClick={onHint} label="HINT" icon={<HintIcon size={28} />} />
      <SideButton
        onClick={onPastScrambles}
        label={"PAST\nSCRAMBLES"}
        icon={<PastScramblesIcon size={28} />}
      />
    </aside>
  );
}
