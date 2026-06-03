import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
  shareText: string;
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  background: "var(--button-fill)",
  color: "var(--button-fg)",
  fontWeight: 700,
};

export function ShareModal({ open, onClose, shareText }: Props) {
  function copy() {
    navigator.clipboard.writeText(shareText);
    onClose();
  }

  function nativeShare() {
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
      return;
    }
    copy();
  }

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function mail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "BUNT RGB challenge"
    )}&body=${encodeURIComponent(shareText)}`;
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <ModalShell open={open} onClose={onClose} title="Share">
      <div style={{ opacity: 0.75, fontSize: 13, whiteSpace: "pre-wrap" }}>{shareText}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        {canNativeShare ? (
          <button type="button" style={btn} onClick={nativeShare}>
            Share…
          </button>
        ) : null}
        <button type="button" style={btn} onClick={copy}>
          Copy
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`)}
        >
          WhatsApp
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`)}
        >
          Telegram
        </button>
        <button
          type="button"
          style={btn}
          onClick={() => openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`)}
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
