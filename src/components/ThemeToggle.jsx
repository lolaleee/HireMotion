import { useTheme } from "../lib/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className={`w-8 h-8 rounded-lg border border-[var(--card-border)] bg-[var(--field-bg)] text-sm ${className}`}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
