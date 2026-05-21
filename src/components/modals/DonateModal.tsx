import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

const BTC = "bc1qjhxpqea96s52m7e7gsn82krvekvvc9cez4kkgs";
const ETH = "0xe8a2d539C53547D0f39f258Dc1a44bec6b997aa1";

export function DonateModal({ open, onClose }: Props) {
  function copy() {
    navigator.clipboard.writeText(`BTC Address\n${BTC}\n\nETH Address\n${ETH}`);
  }

  const btn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--border-soft)",
    background: "var(--button-fill)",
    color: "var(--button-fg)",
    fontWeight: 700,
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Donate">
      <div style={{ opacity: 0.75, fontSize: 13 }}>Thanks for supporting BUNT RGB.</div>
      <div
        style={{
          marginTop: 14,
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          padding: 12,
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>BTC Address</div>
        <div style={{ wordBreak: "break-all" }}>{BTC}</div>
        <div style={{ height: 12 }} />
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>ETH Address</div>
        <div style={{ wordBreak: "break-all" }}>{ETH}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" onClick={copy} style={btn}>
          Copy
        </button>
        <button type="button" onClick={onClose} style={{ ...btn, background: "var(--button-active-bg)", color: "var(--button-active-fg)" }}>
          Close
        </button>
      </div>
    </ModalShell>
  );
}
