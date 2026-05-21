import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "../icons/Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
  maxHeight?: string;
};

export function ModalShell({ open, onClose, title, children, width = 520, maxHeight = "86vh" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--modal-backdrop)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        zIndex: 200,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, 92vw)`,
          maxHeight,
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid var(--modal-border)",
          background: "var(--modal-surface)",
          color: "var(--fg)",
          boxShadow: "0 20px 80px rgba(0,0,0,.35)",
          padding: 20,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg)",
            opacity: 0.85,
          }}
        >
          <CloseIcon size={20} />
        </button>
        {title ? (
          <h2 style={{ margin: "0 36px 12px 0", fontSize: 20, fontWeight: 900, letterSpacing: 0.2 }}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
