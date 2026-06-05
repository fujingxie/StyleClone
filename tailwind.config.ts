import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-light": "var(--primary-light)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        border: "var(--border)",
        surface: "var(--surface)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "PingFang SC",
          "Microsoft YaHei",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        sm: "var(--sh-sm)",
        md: "var(--sh-md)",
        focus: "var(--focus-ring)",
        modal: "0 24px 64px rgba(15,23,42,.28)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
