import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2F8F9D", // Bleu principal
          foreground: "#FFFFFF",
          50: "#E6F4F7",
          100: "#CCE9EF",
          200: "#99D3DF",
          300: "#66BDCF",
          400: "#33A7BF",
          500: "#2F8F9D",
          600: "#26727D",
          700: "#1C555E",
          800: "#13393E",
          900: "#091C1F",
        },
        secondary: {
          DEFAULT: "#1F2A44", // Bleu foncé
          foreground: "#FFFFFF",
          50: "#E8EBF0",
          100: "#D1D7E1",
          200: "#A3AFC3",
          300: "#7587A5",
          400: "#475F87",
          500: "#1F2A44",
          600: "#192236",
          700: "#131929",
          800: "#0C111B",
          900: "#06080E",
        },
        accent: {
          DEFAULT: "#F7941D", // Orange action
          foreground: "#FFFFFF",
          50: "#FEF5E7",
          100: "#FDEBCF",
          200: "#FBD79F",
          300: "#F9C36F",
          400: "#F7AF3F",
          500: "#F7941D",
          600: "#C67617",
          700: "#945811",
          800: "#633B0B",
          900: "#311D06",
        },
        accentLight: {
          DEFAULT: "#FDBA4D", // Orange clair
          foreground: "#1F2A44",
          50: "#FFF8ED",
          100: "#FFF1DB",
          200: "#FFE3B7",
          300: "#FED593",
          400: "#FEC76F",
          500: "#FDBA4D",
          600: "#CA953E",
          700: "#98702E",
          800: "#654A1F",
          900: "#33250F",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#6B7280", // Gris texte secondaire
          foreground: "#FFFFFF",
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "#FFFFFF", // Blanc pour cartes
          foreground: "#1F2A44",
        },
        success: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        error: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config







