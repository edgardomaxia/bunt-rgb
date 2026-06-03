import { useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import { fetchPastScrambles, type PastScramble } from "../../lib/api";
import type { Color } from "../../engine/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onPlay: (grid: Color[]) => void;
};

type Status = "idle" | "loading" | "ready" | "error";

const pad4 = (n: number) => String(n).padStart(4, "0");

export function PastScramblesModal({ open, onClose, onPlay }: Props) {
  const [items, setItems] = useState<PastScramble[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setStatus("loading");
    fetchPastScrambles(30)
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--border-soft)",
  };

  const playBtn: React.CSSProperties = {
    background: "var(--button-active-bg)",
    color: "var(--button-active-fg)",
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1,
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Past Daily Scrambles" width={560} maxHeight="85vh">
      {status === "loading" ? (
        <div style={{ opacity: 0.7, fontSize: 14, padding: 12 }}>Loading…</div>
      ) : status === "error" ? (
        <div style={{ opacity: 0.7, fontSize: 14, padding: 12 }}>
          Couldn’t load past scrambles. Try again later.
        </div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: 14, padding: 12 }}>No past scrambles yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => (
            <div key={it.dailyId} style={rowStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>#{pad4(it.number)}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {it.dailyId} · PAR {it.par}
                </div>
              </div>
              <button
                type="button"
                style={playBtn}
                onClick={() => {
                  onPlay(it.grid);
                  onClose();
                }}
              >
                PLAY
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
