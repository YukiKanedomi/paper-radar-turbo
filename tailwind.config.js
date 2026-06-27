/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 確定モック（viz-panels/paper-radar）のトークンを忠実移植
      colors: {
        paper: "var(--bg)",
        ink: "var(--ink)",
        mut: "var(--mut)",
        accent: "var(--accent)",
        "accent-d": "var(--accent-d)",
        line: "var(--line)",
        soft: "var(--soft)",
        soft2: "var(--soft2)",
      },
      fontFamily: {
        // 本文＝明朝、UI/ラベル＝サンセリフ
        serif: ['"Hiragino Mincho ProN"', '"Yu Mincho"', "Georgia", "serif"],
        ui: ['"Yu Gothic UI"', "sans-serif"],
      },
      maxWidth: { content: "760px" },
      boxShadow: {
        today: "0 8px 24px rgba(29,33,39,.045)",
        card: "0 3px 10px rgba(29,33,39,.035)",
        pop: "0 12px 32px rgba(0,0,0,.22)",
      },
    },
  },
  plugins: [],
};
