#!/usr/bin/env node
/**
 * One Lighthouse run of a URL as a logged-in reader, JSON report on stdout: the
 * lighthouse CLI's run (lighthouse-runner.js), through Lighthouse's Node API so the
 * page can be logged in first (lighthouse-login.js). Its own Chrome, launched with
 * the CLI's flags and a fresh profile, so its cache is as cold as the CLI's.
 *
 * Run once per measurement by lighthouse-runner.js: the process, its Chrome and the
 * report are gone when it exits, so a pass of many runs holds no more than one.
 *
 * Usage: node lighthouse-logged-in-run.js <url> --site https://host --observer <account>
 * Exit: 0 a report on stdout (it may carry a runtimeError), 1 no report.
 */

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');
const { pathToFileURL } = require('url');
const { CHROME_FLAGS } = require('./lighthouse-runner');
const { logIn, validObserver } = require('./lighthouse-login');

// puppeteer-core and chrome-launcher are Lighthouse's own dependencies: found next
// to the `lighthouse` on PATH, so the run uses exactly the CLI's versions.
function lighthousePackageDir() {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const bin = path.join(dir, 'lighthouse');
    if (!fs.existsSync(bin)) continue;
    for (let at = path.dirname(fs.realpathSync(bin)); at !== path.dirname(at); at = path.dirname(at)) {
      const manifest = path.join(at, 'package.json');
      if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === 'lighthouse') return at;
    }
  }
  throw new Error('no lighthouse package found from the lighthouse on PATH');
}

async function importFrom(packageDir, specifier) {
  const resolved = specifier === 'lighthouse' ? path.join(packageDir, 'core/index.js') : require.resolve(specifier, { paths: [packageDir] });
  return import(pathToFileURL(resolved).href);
}

function parseOptions() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { site: { type: 'string' }, observer: { type: 'string' } },
  });
  const [url] = positionals;
  if (positionals.length !== 1 || !/^https?:\/\/[^/]/.test(url) || !/^https?:\/\/[^/]/.test(values.site || '')) {
    throw new Error('usage: lighthouse-logged-in-run.js <url> --site https://host --observer <account>');
  }
  return { url, site: values.site, observer: validObserver(values.observer) };
}

async function main() {
  const { url, site, observer } = parseOptions();
  const packageDir = lighthousePackageDir();
  const { default: lighthouse } = await importFrom(packageDir, 'lighthouse');
  const { default: puppeteer } = await importFrom(packageDir, 'puppeteer-core');
  const chromeLauncher = await importFrom(packageDir, 'chrome-launcher');

  const chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS.split(' ') });
  // The runner's timeout ends this process with SIGTERM: take Chrome with it.
  process.once('SIGTERM', () => {
    chrome.kill();
    process.exit(1);
  });
  try {
    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: null });
    const [page = await browser.newPage()] = await browser.pages();
    await logIn(page, site, observer);
    const result = await lighthouse(url, { output: 'json', logLevel: 'error', disableStorageReset: true }, undefined, page);
    if (!result) throw new Error('lighthouse returned no result');
    await browser.disconnect();
    await new Promise((resolve, reject) => process.stdout.write(result.report, (err) => (err ? reject(err) : resolve())));
  } finally {
    chrome.kill();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(`lighthouse-logged-in-run: ${err.message}`);
    process.exit(1);
  }
);
