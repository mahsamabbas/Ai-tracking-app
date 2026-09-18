import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: "#eef2f6",
          card: "#ffffff",
          border: "#d8e0ea",
          muted: "#64748b",
        },
        ink: {
          950: "#0b1220",
          900: "#111827",
          800: "#1e293b",
        },
        accent: {
          DEFAULT: "#0d9488",
          light: "#5eead4",
          dark: "#0f766e",
          glow: "#2dd4bf",
        },
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          900: "#134e4a",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 40px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
