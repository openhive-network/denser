#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, "../apps/blog/locales");
const REFERENCE_LOCALE = "en";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

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

function loadJson(filePath: string): JsonObject | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as JsonObject;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error loading ${filePath}: ${message}`);
    return null;
  }
}

function getLocales(): string[] {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function getJsonFiles(locale: string): string[] {
  const localeDir = path.join(LOCALES_DIR, locale);
  return fs.readdirSync(localeDir).filter((file) => file.endsWith(".json"));
}

function compareKeys(
  referenceKeys: Set<string>,
  targetKeys: Set<string>
): { missing: string[]; extra: string[] } {
  const missing: string[] = [];
  const extra: string[] = [];

  referenceKeys.forEach((key) => {
    if (!targetKeys.has(key)) {
      missing.push(key);
    }
  });

  targetKeys.forEach((key) => {
    if (!referenceKeys.has(key)) {
      extra.push(key);
    }
  });

  return { missing, extra };
}

function validateTranslations(): void {
  const locales = getLocales();

  if (!locales.includes(REFERENCE_LOCALE)) {
    console.error(`Reference locale '${REFERENCE_LOCALE}' not found!`);
    process.exit(1);
  }

  const referenceFiles = getJsonFiles(REFERENCE_LOCALE);
  let hasErrors = false;
  let totalMissing = 0;
  let totalExtra = 0;

  console.log(`\n📋 Translation Keys Validator (Blog)`);
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`   Checking locales: ${locales.filter((l) => l !== REFERENCE_LOCALE).join(", ")}\n`);

  for (const jsonFile of referenceFiles) {
    const referenceFilePath = path.join(LOCALES_DIR, REFERENCE_LOCALE, jsonFile);
    const referenceData = loadJson(referenceFilePath);

    if (!referenceData) {
      hasErrors = true;
      continue;
    }

    const referenceKeys = getAllKeys(referenceData);
    console.log(`📄 ${jsonFile} (${referenceKeys.size} keys in ${REFERENCE_LOCALE})`);

    for (const locale of locales) {
      if (locale === REFERENCE_LOCALE) continue;

      const targetFilePath = path.join(LOCALES_DIR, locale, jsonFile);

      if (!fs.existsSync(targetFilePath)) {
        console.log(`   ❌ ${locale}: File missing!`);
        hasErrors = true;
        continue;
      }

      const targetData = loadJson(targetFilePath);
      if (!targetData) {
        hasErrors = true;
        continue;
      }

      const targetKeys = getAllKeys(targetData);
      const { missing, extra } = compareKeys(referenceKeys, targetKeys);

      if (missing.length === 0 && extra.length === 0) {
        console.log(`   ✅ ${locale}: OK (${targetKeys.size} keys)`);
      } else {
        hasErrors = true;
        totalMissing += missing.length;
        totalExtra += extra.length;

        console.log(`   ⚠️  ${locale}: ${missing.length} missing, ${extra.length} extra`);

        if (missing.length > 0) {
          console.log(`      Missing keys:`);
          missing.slice(0, 10).forEach((key) => console.log(`        - ${key}`));
          if (missing.length > 10) {
            console.log(`        ... and ${missing.length - 10} more`);
          }
        }

        if (extra.length > 0) {
          console.log(`      Extra keys (not in ${REFERENCE_LOCALE}):`);
          extra.slice(0, 5).forEach((key) => console.log(`        + ${key}`));
          if (extra.length > 5) {
            console.log(`        ... and ${extra.length - 5} more`);
          }
        }
      }
    }
    console.log("");
  }

  for (const locale of locales) {
    if (locale === REFERENCE_LOCALE) continue;

    const localeFiles = getJsonFiles(locale);
    const extraFiles = localeFiles.filter((f) => !referenceFiles.includes(f));

    if (extraFiles.length > 0) {
      console.log(`⚠️  ${locale} has extra files not in ${REFERENCE_LOCALE}: ${extraFiles.join(", ")}`);
      hasErrors = true;
    }
  }

  console.log("\n" + "─".repeat(50));
  if (hasErrors) {
    console.log(`\n❌ Validation failed!`);
    console.log(`   Total missing keys: ${totalMissing}`);
    console.log(`   Total extra keys: ${totalExtra}`);
    console.log(`\n   Fix missing keys by adding them to the respective locale files.`);
    console.log(`   Use English (${REFERENCE_LOCALE}) as the reference.\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ All translations are in sync!\n`);
    process.exit(0);
  }
}

validateTranslations();
