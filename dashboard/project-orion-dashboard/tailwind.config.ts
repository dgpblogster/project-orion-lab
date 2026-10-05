import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Project Orion light theme, tuned for conference projectors
        background: "#F4F6FA",
        surface: "#FFFFFF",
        border: "#E3E7EF",
        "text-primary": "#0B1324",
        "text-muted": "#5B6578",
        "accent-green": "#059669",
        "accent-yellow": "#D97706",
        "accent-red": "#DC2626",
        "accent-blue": "#2563EB",
        brand: "#4338CA",
        "brand-soft": "#EEF0FF",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 10px 28px -14px rgba(16,24,40,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
