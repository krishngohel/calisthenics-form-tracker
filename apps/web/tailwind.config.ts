/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  future: {
    // Touch devices otherwise keep :hover styles stuck after a tap.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    // iOS Human Interface Guidelines text styles (size / line-height).
    fontSize: {
      xs: ["13px", "18px"], // footnote
      sm: ["15px", "20px"], // subheadline
      base: ["17px", "22px"], // body
      lg: ["20px", "25px"], // title 3
      xl: ["22px", "28px"], // title 2
      "2xl": ["28px", "34px"], // title 1
      "3xl": ["34px", "41px"], // large title
      "4xl": ["40px", "46px"],
      "5xl": ["48px", "52px"],
      "6xl": ["60px", "64px"],
    },
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: ["SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        fill: "var(--fill)",
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
        success: "var(--success)",
      },
      boxShadow: {
        card: "0 0 0 0 transparent",
        "card-hover": "0 0 0 0 transparent",
        nav: "0 1px 0 rgb(var(--shadow-color) / 0.06)",
      },
      borderRadius: {
        "2xl": "14px",
        "3xl": "20px",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
