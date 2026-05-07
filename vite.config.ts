import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), ViteImageOptimizer({})],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
    },
    esbuild: {
      pure: mode === "production" ? ["console.log"] : [],
    },
  };
});
