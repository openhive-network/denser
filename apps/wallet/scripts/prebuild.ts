#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyRecursive(src: string, dest: string): void {
  const exists = fs.existsSync(src);
  const stats = exists ? fs.statSync(src) : null;
  const isDirectory = stats?.isDirectory() ?? false;

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log("Running prebuild script...");

interface CopyPattern {
  from: string;
  to: string;
}

const patterns: CopyPattern[] = [
  {
    from: path.join(__dirname, "../../../node_modules/@hiveio/hb-auth/dist/worker.js"),
    to: path.join(__dirname, "../public/auth/worker.js")
  },
  {
    from: path.join(__dirname, "../../../node_modules/@hiveio/hb-auth/dist/assets"),
    to: path.join(__dirname, "../public/auth/assets")
  },
  {
    from: path.join(__dirname, "../locales"),
    to: path.join(__dirname, "../public/locales/")
  },
  {
    from: path.join(__dirname, "../../../packages/smart-signer/locales"),
    to: path.join(__dirname, "../public/locales/")
  },
  {
    from: path.join(__dirname, "../../../packages/smart-signer/public/smart-signer"),
    to: path.join(__dirname, "../public/smart-signer/")
  }
];

patterns.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      copyRecursive(from, to);
      console.log(`✓ Copied: ${path.relative(process.cwd(), from)} → ${path.relative(process.cwd(), to)}`);
    } else {
      console.warn(`⚠ Source not found (skipping): ${from}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to copy ${from} to ${to}:`, message);
    process.exit(1);
  }
});

console.log("Prebuild script completed successfully!");
