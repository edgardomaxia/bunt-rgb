import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SHARE_TEXT = "Can you solve this?\nhttps://bunt-rgb.com/demo/";

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "var(--button-fill)",
  color: "var(--button-fg)",
  fontWeight: 700,
};

export function ShareModal({ open, onClose }: Props) {
  function copy() {
    navigator.clipboard.writeText(SHARE_TEXT);
    onClose();
  }

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function mail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "BUNT RGB challenge"
    )}&body=${encodeURIComponent(SHARE_TEXT)}`;
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Share">
      <div style={{ opacity: 0.75, fontSize: 13, whiteSpace: "pre-wrap" }}>{SHARE_TEXT}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <button type="button" style={btn} onClick={copy}>
          Copy
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`)}
        >
          WhatsApp
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://t.me/share/url?text=${encodeURIComponent(SHARE_TEXT)}`)}
        >
          Telegram
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}`)}
        >
          X
        </button>
        <button type="button" style={btn} onClick={mail}>
          Email
        </button>
      </div>
      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 12 }}>
        Tip: click outside or press ESC to close.
      </div>
    </ModalShell>
  );
}
