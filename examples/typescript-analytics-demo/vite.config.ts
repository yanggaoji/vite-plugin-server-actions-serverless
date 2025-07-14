import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
  plugins: [
    react(),
    serverActions({
      validation: {
        enabled: true,
      },
      openapi: {
        enabled: true,
        info: {
          title: "TypeScript Analytics Demo API",
          version: "1.0.0",
          description: "Advanced TypeScript patterns demonstration with analytics",
        },
      },
    }),
  ],
});