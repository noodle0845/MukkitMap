import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          soft: "#ecfdf5",
          hover: "#059669"
        }
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px"
      },
      boxShadow: {
        soft: "0 6px 20px rgba(15, 23, 42, 0.06)",
        pop: "0 12px 32px rgba(15, 23, 42, 0.14)",
        elev: "0 24px 48px rgba(15, 23, 42, 0.12)"
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Segoe UI",
          "Noto Sans KR",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
