import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "hr-entry",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace('src="/src/main.jsx"', 'src="/src/hr-entry.jsx"');
        },
      },
    },
  ],
  build: {
    outDir: "dist/hr",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    host: true,
  },
  preview: {
    port: 4174,
    host: true,
  },
});
