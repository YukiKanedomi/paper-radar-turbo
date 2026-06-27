import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// GitHub Pages のプロジェクトページ配信（サブパス）対策。
// 真っ白回避のため base を '/<repo名>/' に固定。アセット/データ取得は import.meta.env.BASE_URL 起点。
export default defineConfig({
  base: "/paper-radar-turbo/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
