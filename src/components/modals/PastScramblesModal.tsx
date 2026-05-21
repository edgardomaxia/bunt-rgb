import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PastScramblesModal({ open, onClose }: Props) {
  return (
    <ModalShell open={open} onClose={onClose} title="Past Daily Scrambles" width={560} maxHeight="85vh">
      <div
        style={{
          opacity: 0.85,
          fontSize: 14,
          lineHeight: 1.5,
          border: "1px solid var(--border-soft)",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          letterSpacing: 2,
          fontWeight: 800,
        }}
      >
        COMING SOON.
      </div>
    </ModalShell>
  );
}
