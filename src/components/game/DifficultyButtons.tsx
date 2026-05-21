export type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "EASY" },
  { id: "medium", label: "MEDIUM" },
  { id: "hard", label: "HARD" },
];

type Props = {
  active: Difficulty;
  onChange: (next: Difficulty) => void;
  onCustom?: () => void;
};

export function DifficultyButtons({ active, onChange, onCustom }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        alignItems: "stretch",
      }}
    >
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
        {DIFFICULTIES.map((d) => {
          const isActive = d.id === active;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange(d.id)}
              style={{
                flex: 1,
                padding: "14px 8px",
                borderRadius: 999,
                background: isActive ? "var(--button-active-bg)" : "var(--border-soft)",
                color: isActive ? "var(--button-active-fg)" : "var(--fg)",
                border: "none",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      {onCustom ? (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={onCustom}
            style={{
              flex: 2,
              padding: "14px 16px",
              borderRadius: 999,
              background: "var(--border-soft)",
              color: "var(--fg)",
              border: "none",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            CUSTOM COMPLEXITY
          </button>
        </div>
      ) : null}
    </div>
  );
}
