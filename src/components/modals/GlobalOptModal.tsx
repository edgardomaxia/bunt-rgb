import { useState } from "react";
import { saveGlobalOpt, saveNickname } from "../../lib/storage";
import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  initialNickname: string;
  onClose: () => void;
  onSaved: (opt: "yes" | "no", nickname: string) => void;
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "var(--button-fill)",
  color: "var(--button-fg)",
  fontWeight: 700,
};

export function GlobalOptModal({ open, initialNickname, onClose, onSaved }: Props) {
  const [nickname, setNickname] = useState(initialNickname);

  function decline() {
    saveGlobalOpt("no");
    onSaved("no", nickname);
    onClose();
  }

  function accept() {
    const nn = nickname.trim();
    saveNickname(nn);
    saveGlobalOpt("yes");
    onSaved("yes", nn);
    onClose();
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Save score online?">
      <div style={{ opacity: 0.75, fontSize: 13 }}>
        You'll appear in the Global Leaderboard. Nickname is optional.
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Nickname (optional)</div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. axiomizer"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border-soft)",
            background: "var(--bg-elevated)",
            color: "var(--fg)",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" style={btn} onClick={decline}>
          No thanks
        </button>
        <button
          type="button"
          style={{ ...btn, background: "var(--button-active-bg)", color: "var(--button-active-fg)" }}
          onClick={accept}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}
