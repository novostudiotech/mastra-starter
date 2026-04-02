import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

// Plugin to collect CSS from JS imports and inline font files as data URIs
const cssCollectorPlugin = {
  name: "css-collector",
  setup(build) {
    const collectedCSS = [];

    // Handle .css imports in JS/TS files — collect them
    build.onResolve({ filter: /\.css$/ }, (args) => {
      return {
        path: args.path,
        namespace: "css-stub",
        pluginData: { resolveDir: args.resolveDir, importer: args.importer },
      };
    });

    build.onLoad({ filter: /.*/, namespace: "css-stub" }, async (args) => {
      // Resolve the actual CSS file path
      let cssPath;
      if (args.path.startsWith(".")) {
        cssPath = path.resolve(args.pluginData.resolveDir, args.path);
      } else {
        // Node module resolution — try multiple strategies
        cssPath = null;
        // 1. Try require.resolve (works with non-exported subpaths)
        try {
          cssPath = require.resolve(args.path, { paths: [args.pluginData.resolveDir] });
        } catch {}
        // 2. Fallback: walk up node_modules
        if (!cssPath) {
          const candidate = path.join(args.pluginData.resolveDir, "node_modules", args.path);
          if (fs.existsSync(candidate)) cssPath = candidate;
        }
        // 3. Try from project root
        if (!cssPath) {
          const candidate = path.resolve("node_modules", args.path);
          if (fs.existsSync(candidate)) cssPath = candidate;
        }
        if (!cssPath) cssPath = args.path;
      }

      try {
        const css = fs.readFileSync(cssPath, "utf8");
        // Strip font-face rules to reduce bundle size (katex fonts are huge)
        const strippedCSS = css.replace(/@font-face\s*\{[^}]*\}/g, "");
        collectedCSS.push(strippedCSS);
      } catch {
        // Ignore missing CSS
      }

      return { contents: "", loader: "js" };
    });

    build.onEnd(() => {
      // Write collected CSS to a temp file that we'll inline later
      if (collectedCSS.length > 0) {
        fs.writeFileSync("_collected.css", collectedCSS.join("\n"));
      }
    });
  },
};

const DIST_DIR = "dist";
const API_URL = process.env.API_URL || "https://extensive-gaby-jkchv.novps.app";

async function build() {
  // Ensure dist directory exists
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Clean up temp file
  try { fs.unlinkSync("_collected.css"); } catch {}

  const result = await esbuild.build({
    entryPoints: ["src/App.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    minify: true,
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.API_URL": JSON.stringify(API_URL),
      global: "window",
    },
    loader: {
      ".tsx": "tsx",
      ".ts": "ts",
      ".woff": "dataurl",
      ".woff2": "dataurl",
      ".ttf": "dataurl",
      ".eot": "dataurl",
      ".svg": "dataurl",
      ".png": "dataurl",
    },
    plugins: [cssCollectorPlugin],
  });

  const jsCode = result.outputFiles[0].text;

  // Build our own styles.css
  let cssCode = "";
  try {
    const cssResult = await esbuild.build({
      entryPoints: ["src/styles.css"],
      bundle: true,
      write: false,
      minify: true,
    });
    cssCode = cssResult.outputFiles[0].text;
  } catch {
    // CSS is optional
  }

  // Add collected CSS from JS imports
  try {
    const collected = fs.readFileSync("_collected.css", "utf8");
    cssCode = collected + "\n" + cssCode;
    fs.unlinkSync("_collected.css");
  } catch {
    // No collected CSS
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${cssCode}</style>
</head>
<body>
  <div id="root"></div>
  <script>${jsCode}</script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIST_DIR, "ui.html"), html);
  fs.copyFileSync("manifest.json", path.join(DIST_DIR, "manifest.json"));
  fs.copyFileSync("code.js", path.join(DIST_DIR, "code.js"));
  console.log(`dist/ built (${(html.length / 1024).toFixed(0)} KB)`);
}

build().catch((e) => { console.error(e); process.exit(1); });
