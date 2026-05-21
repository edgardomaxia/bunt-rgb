import { MoonIcon, SunIcon } from "./icons/Icons";

type Props = {
  resolved: "light" | "dark";
  onToggle: () => void;
  size?: number;
};

export function ThemeToggle({ resolved, onToggle, size = 22 }: Props) {
  const isDark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--fg)",
        background: "transparent",
        border: "1px solid var(--border-soft)",
      }}
    >
      {isDark ? <SunIcon size={size} /> : <MoonIcon size={size} />}
    </button>
  );
}
