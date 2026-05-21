import { LogoBuntRGB } from "../icons/Icons";
import { ThemeToggle } from "../ThemeToggle";

type Props = {
  subtitle: string;
  resolved: "light" | "dark";
  onToggleTheme: () => void;
};

export function Header({ subtitle, resolved, onToggleTheme }: Props) {
  return (
    <header
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        position: "relative",
        marginBottom: 4,
      }}
    >
      <div style={{ position: "absolute", right: 0, top: 0 }}>
        <ThemeToggle resolved={resolved} onToggle={onToggleTheme} />
      </div>
      <LogoBuntRGB height={56} />
      <div
        style={{
          color: "var(--fg-muted)",
          fontWeight: 900,
          letterSpacing: 2,
          fontSize: 22,
        }}
      >
        {subtitle}
      </div>
    </header>
  );
}
