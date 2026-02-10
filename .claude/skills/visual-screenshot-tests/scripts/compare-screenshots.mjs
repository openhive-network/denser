#!/usr/bin/env node

/**
 * Screenshot comparison script.
 * Compares images in current-screenshots/ against base-screenshots/
 * using pixel-level diff with pngjs.
 *
 * Usage:
 *   node compare-screenshots.mjs [--threshold 0.1] [--base-dir path] [--current-dir path] [--diff-dir path]
 *
 * Output: JSON line prefixed with __COMPARE_RESULT__ containing comparison results
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { PNG } from 'pngjs';

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const THRESHOLD = parseFloat(getArg('threshold', '0.1'));
const BASE_DIR = getArg('base-dir', 'playwright/base-screenshots');
const CURRENT_DIR = getArg('current-dir', 'playwright/current-screenshots');
const DIFF_DIR = getArg('diff-dir', 'playwright/diff-screenshots');

// Ensure diff directory exists
if (!existsSync(DIFF_DIR)) {
  mkdirSync(DIFF_DIR, { recursive: true });
}

/**
 * Load a PNG file and return its pixel data and dimensions
 */
function loadPNG(filePath) {
  const data = readFileSync(filePath);
  const png = PNG.sync.read(data);
  return png;
}

/**
 * Compare two pixels at given index, return squared color distance
 */
function pixelDistance(img1Data, img2Data, idx) {
  const r1 = img1Data[idx], g1 = img1Data[idx + 1], b1 = img1Data[idx + 2], a1 = img1Data[idx + 3];
  const r2 = img2Data[idx], g2 = img2Data[idx + 1], b2 = img2Data[idx + 2], a2 = img2Data[idx + 3];

  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const da = a1 - a2;

  return Math.sqrt((dr * dr + dg * dg + db * db + da * da) / (255 * 255 * 4));
}

/**
 * Compare two images pixel by pixel and generate a diff image
 */
function compareImages(basePath, currentPath, diffPath) {
  const baseImg = loadPNG(basePath);
  const currentImg = loadPNG(currentPath);

  const result = {
    name: basename(basePath),
    baseDimensions: { width: baseImg.width, height: baseImg.height },
    currentDimensions: { width: currentImg.width, height: currentImg.height },
    dimensionsMismatch: false,
    totalPixels: 0,
    differentPixels: 0,
    diffPercentage: 0,
    passed: true,
    diffImagePath: null,
    error: null
  };

  // Check dimension mismatch
  if (baseImg.width !== currentImg.width || baseImg.height !== currentImg.height) {
    result.dimensionsMismatch = true;
    result.passed = false;
    result.error = `Dimension mismatch: base=${baseImg.width}x${baseImg.height}, current=${currentImg.width}x${currentImg.height}`;

    // Compare using the smaller dimensions
    const minWidth = Math.min(baseImg.width, currentImg.width);
    const minHeight = Math.min(baseImg.height, currentImg.height);
    const maxWidth = Math.max(baseImg.width, currentImg.width);
    const maxHeight = Math.max(baseImg.height, currentImg.height);

    result.totalPixels = maxWidth * maxHeight;

    // Create diff image with max dimensions
    const diffPng = new PNG({ width: maxWidth, height: maxHeight });

    let diffCount = 0;

    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < maxWidth; x++) {
        const diffIdx = (y * maxWidth + x) * 4;

        if (x >= minWidth || y >= minHeight) {
          // Out of bounds for one image - mark as magenta
          diffPng.data[diffIdx] = 255;
          diffPng.data[diffIdx + 1] = 0;
          diffPng.data[diffIdx + 2] = 255;
          diffPng.data[diffIdx + 3] = 255;
          diffCount++;
        } else {
          const baseIdx = (y * baseImg.width + x) * 4;
          const currentIdx = (y * currentImg.width + x) * 4;
          const dist = pixelDistance(baseImg.data, currentImg.data, baseIdx);

          if (dist > THRESHOLD) {
            // Red for different pixels
            diffPng.data[diffIdx] = 255;
            diffPng.data[diffIdx + 1] = 0;
            diffPng.data[diffIdx + 2] = 0;
            diffPng.data[diffIdx + 3] = 255;
            diffCount++;
          } else {
            // Dimmed original for matching pixels
            diffPng.data[diffIdx] = currentImg.data[currentIdx] >> 1;
            diffPng.data[diffIdx + 1] = currentImg.data[currentIdx + 1] >> 1;
            diffPng.data[diffIdx + 2] = currentImg.data[currentIdx + 2] >> 1;
            diffPng.data[diffIdx + 3] = 255;
          }
        }
      }
    }

    result.differentPixels = diffCount;
    result.diffPercentage = parseFloat(((diffCount / result.totalPixels) * 100).toFixed(2));

    writeFileSync(diffPath, PNG.sync.write(diffPng));
    result.diffImagePath = diffPath;

    return result;
  }

  // Same dimensions - compare pixel by pixel
  const { width, height } = baseImg;
  result.totalPixels = width * height;

  const diffPng = new PNG({ width, height });
  let diffCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = pixelDistance(baseImg.data, currentImg.data, idx);

      if (dist > THRESHOLD) {
        // Red for different pixels
        diffPng.data[idx] = 255;
        diffPng.data[idx + 1] = 0;
        diffPng.data[idx + 2] = 0;
        diffPng.data[idx + 3] = 255;
        diffCount++;
      } else {
        // Dimmed original for matching pixels
        diffPng.data[idx] = currentImg.data[idx] >> 1;
        diffPng.data[idx + 1] = currentImg.data[idx + 1] >> 1;
        diffPng.data[idx + 2] = currentImg.data[idx + 2] >> 1;
        diffPng.data[idx + 3] = 255;
      }
    }
  }

  result.differentPixels = diffCount;
  result.diffPercentage = parseFloat(((diffCount / result.totalPixels) * 100).toFixed(2));
  result.passed = result.diffPercentage < 1.0; // less than 1% diff = pass

  if (diffCount > 0) {
    writeFileSync(diffPath, PNG.sync.write(diffPng));
    result.diffImagePath = diffPath;
  }

  return result;
}

// Main execution
console.log('=== Screenshot Comparison ===');
console.log(`Base directory: ${BASE_DIR}`);
console.log(`Current directory: ${CURRENT_DIR}`);
console.log(`Diff directory: ${DIFF_DIR}`);
console.log(`Threshold: ${THRESHOLD}`);
console.log('');

if (!existsSync(BASE_DIR)) {
  console.error(`ERROR: Base screenshots directory not found: ${BASE_DIR}`);
  process.exit(1);
}

if (!existsSync(CURRENT_DIR)) {
  console.error(`ERROR: Current screenshots directory not found: ${CURRENT_DIR}`);
  console.error('Run the screenshot tests first to generate current screenshots.');
  process.exit(1);
}

const baseFiles = readdirSync(BASE_DIR).filter(f => f.endsWith('.png'));
const currentFiles = readdirSync(CURRENT_DIR).filter(f => f.endsWith('.png'));

if (baseFiles.length === 0) {
  console.error('ERROR: No PNG files found in base-screenshots directory');
  process.exit(1);
}

const results = [];
let allPassed = true;

// Compare each base screenshot with its current counterpart
for (const file of baseFiles) {
  const basePath = join(BASE_DIR, file);
  const currentPath = join(CURRENT_DIR, file);
  const diffPath = join(DIFF_DIR, `diff-${file}`);

  if (!existsSync(currentPath)) {
    const missingResult = {
      name: file,
      passed: false,
      error: `Missing in current screenshots: ${file}`,
      differentPixels: null,
      diffPercentage: null,
      diffImagePath: null
    };
    results.push(missingResult);
    allPassed = false;
    console.log(`MISSING: ${file} - not found in current-screenshots/`);
    continue;
  }

  try {
    const result = compareImages(basePath, currentPath, diffPath);
    results.push(result);

    if (!result.passed) allPassed = false;

    const status = result.passed ? 'PASS' : 'FAIL';
    const diffInfo = result.dimensionsMismatch
      ? `DIMENSIONS MISMATCH (${result.error})`
      : `${result.diffPercentage}% different (${result.differentPixels}/${result.totalPixels} pixels)`;

    console.log(`${status}: ${file} - ${diffInfo}`);
  } catch (err) {
    const errorResult = {
      name: file,
      passed: false,
      error: err.message,
      differentPixels: null,
      diffPercentage: null,
      diffImagePath: null
    };
    results.push(errorResult);
    allPassed = false;
    console.log(`ERROR: ${file} - ${err.message}`);
  }
}

// Check for extra screenshots in current that are not in base
const extraFiles = currentFiles.filter(f => !baseFiles.includes(f));
for (const file of extraFiles) {
  console.log(`NEW: ${file} - exists in current-screenshots/ but not in base-screenshots/`);
}

console.log('');
console.log(`=== Results: ${results.filter(r => r.passed).length}/${results.length} PASSED ===`);

const summary = {
  totalComparisons: results.length,
  passed: results.filter(r => r.passed).length,
  failed: results.filter(r => !r.passed).length,
  newScreenshots: extraFiles,
  allPassed,
  results,
  diffDir: DIFF_DIR,
  baseDir: BASE_DIR,
  currentDir: CURRENT_DIR
};

// Output structured result for parsing
console.log('');
console.log(`__COMPARE_RESULT__${JSON.stringify(summary)}`);

process.exit(allPassed ? 0 : 1);
