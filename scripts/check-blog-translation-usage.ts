#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, "../apps/blog");
const LOCALES_DIR = path.join(BLOG_DIR, "locales");
const REFERENCE_LOCALE = "en";
const SOURCE_DIRS = ["app", "components", "features", "lib", "pages"];
const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

const TRANSLATION_PATTERNS = [
  /\bt\(\s*['"`]([^'"`\n]+?)['"`]\s*(?:,|\))/g,
  /i18nKey\s*=\s*['"`]([^'"`\n]+?)['"`]/g
];

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

interface KeyLocation {
  file: string;
  lines: number[];
}

function getAllKeys(obj: JsonObject, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedKeys = getAllKeys(value as JsonObject, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

function loadTranslationKeys(): Set<string> {
  const keys = new Set<string>();
  const localeDir = path.join(LOCALES_DIR, REFERENCE_LOCALE);

  if (!fs.existsSync(localeDir)) {
    console.error(`Reference locale directory not found: ${localeDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(localeDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(localeDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8")) as JsonObject;
      const fileKeys = getAllKeys(content);
      fileKeys.forEach((k) => keys.add(k));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error loading ${filePath}: ${message}`);
    }
  }

  return keys;
}

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...findSourceFiles(fullPath));
      }
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractKeysFromFile(filePath: string): { keys: Map<string, number[]>; file: string } {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const keys = new Map<string, number[]>();

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of TRANSLATION_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];

        if (key.includes("${") || key.includes("{") || key.includes("+")) {
          continue;
        }

        if (!keys.has(key)) {
          keys.set(key, []);
        }
        keys.get(key)!.push(lineNum + 1);
      }
    }
  }

  return { keys, file: filePath };
}

function validateTranslationUsage(): void {
  const showUnused = process.argv.includes("--unused");

  console.log("\n📋 Translation Usage Validator (Blog)");
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`   Scanning: ${SOURCE_DIRS.join(", ")}\n`);

  const validKeys = loadTranslationKeys();
  console.log(`   Found ${validKeys.size} translation keys in ${REFERENCE_LOCALE}\n`);

  const sourceFiles: string[] = [];
  for (const dir of SOURCE_DIRS) {
    sourceFiles.push(...findSourceFiles(path.join(BLOG_DIR, dir)));
  }
  console.log(`   Scanning ${sourceFiles.length} source files...\n`);

  const usedKeys = new Set<string>();
  const missingKeys = new Map<string, KeyLocation[]>();
  let totalUsages = 0;

  for (const filePath of sourceFiles) {
    const { keys } = extractKeysFromFile(filePath);
    const relativePath = path.relative(BLOG_DIR, filePath);

    for (const [key, lineNumbers] of keys) {
      totalUsages += lineNumbers.length;
      usedKeys.add(key);

      if (!validKeys.has(key)) {
        if (!missingKeys.has(key)) {
          missingKeys.set(key, []);
        }
        missingKeys.get(key)!.push({ file: relativePath, lines: lineNumbers });
      }
    }
  }

  let hasErrors = false;

  if (missingKeys.size > 0) {
    hasErrors = true;
    console.log(`❌ Missing translation keys (${missingKeys.size} keys not found in ${REFERENCE_LOCALE}):\n`);

    const sortedKeys = [...missingKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, locations] of sortedKeys) {
      console.log(`   "${key}"`);
      for (const { file, lines } of locations) {
        console.log(`      └─ ${file}:${lines.join(", ")}`);
      }
    }
    console.log("");
  } else {
    console.log(`✅ All ${totalUsages} translation usages reference valid keys\n`);
  }

  if (showUnused) {
    const unusedKeys = [...validKeys].filter((k) => !usedKeys.has(k));

    if (unusedKeys.length > 0) {
      console.log(`⚠️  Potentially unused translation keys (${unusedKeys.length} keys):\n`);
      console.log("   Note: Some keys may be used dynamically and not detected.\n");

      const grouped: Record<string, string[]> = {};
      for (const key of unusedKeys) {
        const namespace = key.split(".")[0];
        if (!grouped[namespace]) {
          grouped[namespace] = [];
        }
        grouped[namespace].push(key);
      }

      for (const [namespace, keys] of Object.entries(grouped)) {
        console.log(`   ${namespace}/ (${keys.length} keys)`);
        keys.slice(0, 5).forEach((k) => console.log(`      - ${k}`));
        if (keys.length > 5) {
          console.log(`      ... and ${keys.length - 5} more`);
        }
      }
      console.log("");
    } else {
      console.log(`✅ All translation keys appear to be used\n`);
    }
  }

  console.log("─".repeat(50));
  console.log(`\n   Total translation keys: ${validKeys.size}`);
  console.log(`   Keys used in code: ${usedKeys.size}`);
  console.log(`   Total usages found: ${totalUsages}`);

  if (hasErrors) {
    console.log(`\n❌ Validation failed! Add missing keys to apps/blog/locales/${REFERENCE_LOCALE}/common_blog.json\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ Translation usage validation passed!\n`);
    process.exit(0);
  }
}

validateTranslationUsage();
