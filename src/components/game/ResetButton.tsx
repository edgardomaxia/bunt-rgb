type Props = {
  onClick: () => void;
  fullWidth?: boolean;
};

export function ResetButton({ onClick, fullWidth = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--button-fill)",
        color: "var(--button-fg)",
        border: "2px solid var(--fg)",
        borderRadius: 999,
        padding: "16px 56px",
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 1,
        minWidth: fullWidth ? "100%" : 220,
      }}
    >
      RESET
    </button>
  );
}
