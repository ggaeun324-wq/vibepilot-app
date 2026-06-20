// Post-build step for the desktop bundle.
//
// Next.js standalone output does NOT include the static assets or the public/
// folder, and we also want a seed SQLite database shipped with the app. This
// script copies all of those into .next/standalone so electron-builder can
// package a self-contained server.

import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

function copy(from, to, label) {
  if (!existsSync(from)) {
    console.warn(`[prepare-standalone] skip ${label}: ${from} not found`);
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[prepare-standalone] copied ${label}`);
}

// 1. Static assets (JS/CSS chunks) -> standalone/.next/static
copy(
  join(root, ".next", "static"),
  join(standalone, ".next", "static"),
  ".next/static"
);

// 2. public/ assets -> standalone/public
copy(join(root, "public"), join(standalone, "public"), "public/");

// 3. Seed database -> standalone/prisma/vibepilot.db (used as the seed source)
copy(
  join(root, "prisma", "vibepilot.db"),
  join(standalone, "prisma", "vibepilot.db"),
  "seed database"
);

console.log("[prepare-standalone] done");
