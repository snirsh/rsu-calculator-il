import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages at https://<user>.github.io/<repo>/ the app is
// served from a sub-path. Set BASE_PATH in CI to that sub-path (e.g. "/repo/").
// Locally and for user/org pages it defaults to "/".
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
