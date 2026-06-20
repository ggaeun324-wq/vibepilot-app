// electron-builder afterPack hook.
//
// electron-builder's file walker strips `node_modules` out of `extraResources`
// directory copies, which breaks the bundled Next.js standalone server (it can
// no longer require "next"). To work around this we copy the entire standalone
// output ourselves with fs.cpSync, which preserves node_modules verbatim.

const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const projectRoot = path.resolve(__dirname, "..");
  const src = path.join(projectRoot, ".next", "standalone");
  const dest = path.join(
    context.appOutDir,
    "resources",
    "app",
    ".next",
    "standalone"
  );

  if (!fs.existsSync(src)) {
    throw new Error(`[after-pack] standalone build not found at ${src}`);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });

  const nextDir = path.join(dest, "node_modules", "next");
  if (!fs.existsSync(nextDir)) {
    throw new Error(
      "[after-pack] node_modules/next missing after copy — packaging would be broken"
    );
  }
  console.log(`[after-pack] standalone copied with node_modules -> ${dest}`);
};
