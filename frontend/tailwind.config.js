/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e14",
        panel: "#111823",
        panelAlt: "#0e1520",
        border: "#1f2a3a",
        accent: "#22d3ee",
        accentDim: "#0e7490",
        danger: "#f87171",
        success: "#34d399",
        warning: "#fbbf24",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(34, 211, 238, 0.15)",
      },
    },
  },
  plugins: [],
};