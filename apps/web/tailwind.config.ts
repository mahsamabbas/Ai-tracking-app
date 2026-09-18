import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f7f9",
        card: "#ffffff",
        line: { DEFAULT: "#e5e7eb", strong: "#d1d5db" },
        ink: {
          900: "#0f1115",
          700: "#374151",
          500: "#6b7280",
          400: "#9ca3af",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        state: {
          ok: "#0d9488",
          okSoft: "#ccfbf1",
          warn: "#d97706",
          warnSoft: "#fef3c7",
          bad: "#e11d48",
          badSoft: "#ffe4e6",
          idle: "#64748b",
          idleSoft: "#f1f5f9",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.04)",
        pop: "0 8px 28px rgba(16,24,40,0.12)",
      },
      borderRadius: { xl: "0.75rem", "2xl": "1rem" },
    },
  },
  plugins: [],
};

export default config;
