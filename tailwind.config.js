/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy: {
          0: "rgb(var(--navy-0) / <alpha-value>)",
          1: "rgb(var(--navy-1) / <alpha-value>)",
          2: "rgb(var(--navy-2) / <alpha-value>)",
          3: "rgb(var(--navy-3) / <alpha-value>)",
        },
        ink: {
          2: "rgb(var(--ink-2) / <alpha-value>)",
          1: "rgb(var(--ink-1) / <alpha-value>)",
          0: "rgb(var(--ink-0) / <alpha-value>)",
        },
        amber: "#e0a458",
        teal: "#2a6f6f",
        ok: "#4caf82",
        warn: "#d9a441",
        bad: "#c56464",
      },
    },
  },
  plugins: [],
};
