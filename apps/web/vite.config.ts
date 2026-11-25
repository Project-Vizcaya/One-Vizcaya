import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import fs from "fs";

// The website's "Download for Android" links to this file only if it was
// placed in public/downloads before the build (it is gitignored). Otherwise
// the page says the app is coming soon instead of linking to nothing.
const APK = path.resolve(__dirname, "public/downloads/One-Vizcaya.apk");
const apkAvailable = fs.existsSync(APK);
const apkSizeMb = apkAvailable ? Math.round(fs.statSync(APK).size / 1e6) : 0;

// Preloads the public site's first-screen font weights (Atkinson Hyperlegible
// Next, latin: body 400, buttons 700, headings 800) so they arrive with the
// page code instead of after it. Without this the text first paints in the
// fallback font and reflows when Atkinson loads (layout shift 0.15 on /privacy).
const preloadFonts = (): Plugin => ({
  name: "preload-site-fonts",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) =>
        /atkinson-hyperlegible-next-latin-(400|700|800)-normal-[^/]*\.woff2$/.test(f));
      return files.map((f) => ({
        tag: "link",
        attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${f}`, crossorigin: "" },
        injectTo: "head" as const,
      }));
    },
  },
});

export default defineConfig({
  define: {
    __APK_AVAILABLE__: JSON.stringify(apkAvailable),
    __APK_SIZE_MB__: JSON.stringify(apkSizeMb),
  },
  plugins: [
    // autoCodeSplitting: each page is its own chunk, loaded when first opened,
    // so a slow connection does not download the charts, map and every other
    // page just to show the first screen.
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts", autoCodeSplitting: true }),
    react(),
    preloadFonts(),
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
