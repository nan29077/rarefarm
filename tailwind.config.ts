import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 레어팜 파스텔 그린 팔레트
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        gold: {
          50:  "#fffef0",
          100: "#fefce8",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#c9a227",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          deep: "#111111",
        },
      },
      maxWidth: { app: "560px" },
    },
  },
  plugins: [],
};
export default config;
