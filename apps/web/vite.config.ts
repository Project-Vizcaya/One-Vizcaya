import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    // autoCodeSplitting: each page is its own chunk, loaded when first opened,
    // so a slow connection does not download the charts, map and every other
    // page just to show the first screen.
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "firebase-vendor": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "router-vendor": ["@tanstack/react-router", "@tanstack/react-query"],
          // recharts and the maps library are NOT listed: naming them here
          // made the entry page preload them. Left alone, they are fetched only
          // by the pages that use them.
        },
      },
    },
  },
});
