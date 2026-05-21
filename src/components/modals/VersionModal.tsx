import { VERSION_HISTORY } from "../../meta/versions";
import { ModalShell } from "./ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VersionModal({ open, onClose }: Props) {
  return (
    <ModalShell open={open} onClose={onClose} title="Version history" width={680} maxHeight="min(760px, 86vh)">
      <div style={{ opacity: 0.65, fontSize: 12 }}>Click outside or press ESC to close.</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {VERSION_HISTORY.map((v) => (
          <div
            key={v.version}
            style={{
              borderRadius: 14,
              border: "1px solid var(--border-soft)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 800 }}>v{v.version}</div>
            {v.notes.length > 0 ? (
              <ul style={{ fontSize: 13, opacity: 0.85, marginTop: 6, paddingLeft: 18, lineHeight: 1.45 }}>
                {v.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
