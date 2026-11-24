import type { Config } from "tailwindcss";

// Same tokens as the One Vizcaya admin console (apps/web/src/index.css).
const hsl = (v: string) => `hsl(var(${v}))`;
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: hsl("--border"),
        background: hsl("--background"),
        foreground: hsl("--foreground"),
        primary: { DEFAULT: hsl("--primary"), foreground: hsl("--primary-foreground") },
        muted: { DEFAULT: hsl("--muted"), foreground: hsl("--muted-foreground") },
        accent: { DEFAULT: hsl("--accent"), foreground: hsl("--accent-foreground") },
        card: { DEFAULT: hsl("--card"), foreground: hsl("--card-foreground") },
        destructive: { DEFAULT: hsl("--destructive"), foreground: hsl("--destructive-foreground") },
        gov: { 900: hsl("--gov-green-900"), 800: hsl("--gov-green-800"), 700: hsl("--gov-green-700"), 50: hsl("--gov-green-50") },
        gold: { DEFAULT: hsl("--gold"), soft: hsl("--gold-soft") },
        ring: hsl("--ring"),
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 1px)" },
      fontFamily: { code: ['"Atkinson Hyperlegible Mono"', "ui-monospace", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
