import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "candidate-entry",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace('src="/src/main.jsx"', 'src="/src/candidate-entry.jsx"');
        },
      },
    },
  ],
  build: {
    outDir: "dist/candidate",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
