#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, "../apps/blog/locales");
const REFERENCE_LOCALE = "en";
const TARGET_LOCALES = ["ar", "es", "fr", "it", "ja", "pl", "ru", "zh"];

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function getNestedValue(obj: JsonObject, keyPath: string): JsonValue | undefined {
  return keyPath.split(".").reduce<JsonValue | undefined>(
    (current, key) => {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        return current[key];
      }
      return undefined;
    },
    obj
  );
}

function setNestedValue(obj: JsonObject, keyPath: string, value: JsonValue): void {
  const keys = keyPath.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;

  const target = keys.reduce<JsonObject>((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key] as JsonObject;
  }, obj);

  target[lastKey] = value;
}

function deleteNestedKey(obj: JsonObject, keyPath: string): void {
  const keys = keyPath.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;

  const target = keys.reduce<JsonValue | undefined>(
    (current, key) => {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        return current[key];
      }
      return undefined;
    },
    obj
  );

  if (target && typeof target === "object" && !Array.isArray(target) && lastKey in target) {
    delete target[lastKey];
  }
}

function getAllKeys(obj: JsonObject, prefix = ""): string[] {
  let keys: string[] = [];

  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value as JsonObject, newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }

  return keys;
}

function cleanEmptyObjects(obj: JsonObject): void {
  for (const key in obj) {
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      cleanEmptyObjects(value as JsonObject);
      if (Object.keys(value).length === 0) {
        delete obj[key];
      }
    }
  }
}

console.log("🔧 Fixing blog translations...\n");

const refFile = path.join(LOCALES_DIR, REFERENCE_LOCALE, "common_blog.json");
const refData = JSON.parse(fs.readFileSync(refFile, "utf8")) as JsonObject;
const refKeys = getAllKeys(refData);

console.log(`📚 Reference (en): ${refKeys.length} keys\n`);

let totalAdded = 0;
let totalRemoved = 0;

for (const locale of TARGET_LOCALES) {
  const localeFile = path.join(LOCALES_DIR, locale, "common_blog.json");
  const localeData = JSON.parse(fs.readFileSync(localeFile, "utf8")) as JsonObject;
  const localeKeys = getAllKeys(localeData);

  const missingKeys = refKeys.filter((key) => !getNestedValue(localeData, key));
  const extraKeys = localeKeys.filter((key) => !getNestedValue(refData, key));

  console.log(`📝 ${locale}: ${missingKeys.length} missing, ${extraKeys.length} extra`);

  for (const key of missingKeys) {
    const value = getNestedValue(refData, key);
    if (value !== undefined) {
      setNestedValue(localeData, key, value);
    }
  }

  for (const key of extraKeys) {
    deleteNestedKey(localeData, key);
  }

  cleanEmptyObjects(localeData);

  fs.writeFileSync(localeFile, JSON.stringify(localeData, null, 2) + "\n", "utf8");

  totalAdded += missingKeys.length;
  totalRemoved += extraKeys.length;
}

console.log(`\n✅ Done!`);
console.log(`   Added: ${totalAdded} keys`);
console.log(`   Removed: ${totalRemoved} keys`);
console.log(`   Files updated: ${TARGET_LOCALES.length}`);
