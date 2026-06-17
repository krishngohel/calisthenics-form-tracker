/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        foreground: "var(--text)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          muted: "var(--accent-muted)",
          foreground: "var(--accent-foreground)",
        },
        muted: "var(--muted)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow-color) / 0.04), 0 4px 16px rgb(var(--shadow-color) / 0.06)",
        "card-hover":
          "0 2px 4px rgb(var(--shadow-color) / 0.05), 0 8px 24px rgb(var(--shadow-color) / 0.08)",
        nav: "0 1px 0 rgb(var(--shadow-color) / 0.04), 0 4px 12px rgb(var(--shadow-color) / 0.04)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
