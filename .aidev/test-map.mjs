// The change-to-tests map of the full slot: from a candidate's changed paths,
// which full suites its change can reach, and which of the blog's fixture specs
// (apps/blog/playwright/tests/fixture/*.spec.ts).
//
//   node .aidev/test-map.mjs select <suite>  # a suite's `select:` (.aidev/project.yaml):
//                                            # exit 0 selected, 77 not selected
//   node .aidev/test-map.mjs plan            # for an agent: the suites, the fixture specs,
//                                            # and the aidev invocations that run them
//   node .aidev/test-map.mjs suites          # every suite this map decides, `run` or `skip`
//   node .aidev/test-map.mjs specs           # the fixture specs, relative to apps/blog
//
// The changed paths, first source that exists (as .aidev/run-live-e2e.sh):
//   1. $AIDEV_CHANGED_FILES_FILE (one path per line, a deletion as D<TAB>path),
//      which AIDEV's gates publish with $AIDEV_BASE_REF (ai/aidev#14456);
//   2. git: every path that differs between the merge base of <base> and HEAD and
//      the working tree, untracked files included, <base> = $AIDEV_BASE_REF, else
//      $DENSER_TEST_MAP_BASE, else the first of origin/aidev/integration,
//      aidev/integration, origin/develop.
// Neither, or an empty change, selects everything.
//
// The map only ever widens. A path it cannot classify (a workspace package, a
// lockfile, root or build config, scripts/, .aidev/ itself, anything unknown)
// selects every suite and every spec; so does Playwright code that is loaded by
// something other than an import (a config's string path) or whose importers end
// anywhere this map does not recognise. Rules, first match:
//   - docs (docs/**, root *.md, CLAUDE.md/AGENTS.md anywhere, *.md under a
//     playwright/ directory): nothing;
//   - apps/wallet/playwright** (the wallet's Playwright code, configs and
//     recordings): wallet_fixture, plus what the files importing it reach;
//   - a blog recording, apps/blog/playwright/tests/mock/fixtures/<set>/**: what the
//     Playwright code naming '<set>' reaches (the specs that replay it), and
//     lighthouse_fixture for the set it replays (LIGHTHOUSE_SET); any other set
//     nothing names selects everything;
//   - a spec's snapshots, <spec>.spec.ts-snapshots/**: what the spec reaches;
//   - Playwright source of the blog (apps/blog/playwright**) or the shared
//     playwright/: the suites and specs its importers reach (lighthouse_fixture
//     when that includes the fixture proxy it loads; an app's suite when that
//     includes a live e2e spec, which live_e2e runs on the suite's build). A config's app-relative
//     string path ('playwright/...', its global setup) counts as an import;
//   - other Playwright files of the blog or playwright/ (data): what the code
//     naming the file (a quoted basename) reaches; data nothing names selects
//     everything;
//   - other apps/blog/** (app source, its config, locales, public): the blog's
//     fixture suites, every fixture spec and lighthouse_fixture;
//   - other apps/wallet/**: wallet_fixture and lighthouse_fixture;
//   - anything else: everything.
// App source also selects what the files importing it reach, so a relative import
// across apps carries its app's suites over.
//
// `unit` and `static` take no select (they run for every change), and live_e2e
// selects its own specs (.aidev/run-live-e2e.sh).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importerClosure, isSource, reverseImports, SOURCE_SUFFIXES, sourceFiles } from './import-graph.mjs';

export const SELECT_SKIP_EXIT = 77;
const BLOG_SUITES = ['fixture_e2e', 'fixture_e2e_shard_2', 'fixture_e2e_shard_3'];
const WALLET_SUITE = 'wallet_fixture';
const LIGHTHOUSE_SUITE = 'lighthouse_fixture';
export const MAPPED_SUITES = [...BLOG_SUITES, WALLET_SUITE, LIGHTHOUSE_SUITE];

const FALLBACK_BASES = ['origin/aidev/integration', 'aidev/integration', 'origin/develop'];
const SCANNED_ROOTS = ['apps', 'playwright'];
const BLOG_APP_DIR = 'apps/blog';
const FIXTURE_SPEC = /^apps\/blog\/playwright\/tests\/fixture\/[^/]+\.spec\.ts$/;
const FIXTURE_SPEC_DIR = 'apps/blog/playwright/tests/fixture';
const FIXTURE_CONFIG = 'apps/blog/playwright.fixture.config.ts';
// live_e2e runs these against fixture_e2e's and wallet_fixture's builds.
const BLOG_LIVE_SPEC = /^apps\/blog\/playwright\/tests\/e2e\/.+\.spec\.ts$/;
const WALLET_LIVE_SPEC = /^apps\/wallet\/playwright\/tests\/e2e\/.+\.spec\.ts$/;
const WALLET_FIXTURE_ENTRY = [/^apps\/wallet\/playwright\/tests\/fixture\/.+\.spec\.ts$/, /^apps\/wallet\/playwright\.fixture\.config\.ts$/];
// Loaded by .aidev/fixture-proxy-serve.mjs, the Lighthouse pass's API replay.
const LIGHTHOUSE_LOADED = 'apps/blog/playwright/tests/support/mock-server/fixture-proxy.ts';
const BLOG_RECORDING = /^apps\/blog\/playwright\/tests\/mock\/fixtures\/([^/]+)\//;
const BLOG_SNAPSHOTS = /^(apps\/blog\/playwright\/tests\/.+\.spec\.ts)-snapshots\//;
// The one recording .aidev/run-lighthouse-fixture.sh replays (its set_name).
export const LIGHTHOUSE_SET = 'lighthouse';
const CONFIG = /^apps\/([^/]+)\/playwright[^/]*\.config\.ts$/;
const CONFIG_PATH = /(['"`])(playwright\/[^'"`\n$]+)\1/g;
const DOCS = [/^docs\//, /^[^/]+\.md$/, /(^|\/)(CLAUDE|AGENTS)\.md$/, /(^|\/)playwright\/(.+\/)?[^/]+\.md$/];
const WALLET_PLAYWRIGHT = /^apps\/wallet\/playwright(\/|\.[^/]*$)/;
const BLOG_PLAYWRIGHT = /^apps\/blog\/playwright(\/|\.[^/]*$)/;
const SHARED_PLAYWRIGHT = /^playwright\//;
// What an import chain of Playwright code may end at besides a fixture spec or
// config: another kind of spec or setup, another config, a node:test unit.
const RECOGNISED_ENTRY = [
  /^apps\/[^/]+\/playwright\/tests\/.+\.(spec|setup)\.ts$/,
  /^apps\/[^/]+\/playwright[^/]*\.config\.ts$/,
  /\.test\.(ts|mjs|js)$/
];

// ---- the changed paths --------------------------------------------------------

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function nulSeparated(output) {
  return output.split('\0').filter(Boolean);
}

/** The changed paths and where they came from; `paths` is null when there is no change information. */
export function changeInformation(env) {
  const file = env.AIDEV_CHANGED_FILES_FILE;
  if (file && fs.existsSync(file)) {
    const paths = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => line.replace(/^D\t/, ''));
    return { paths, source: 'AIDEV_CHANGED_FILES_FILE' };
  }
  try {
    git(['rev-parse', '--git-dir']);
  } catch {
    return { paths: null, source: 'no AIDEV_CHANGED_FILES_FILE and no git metadata in the workspace' };
  }
  const base = env.AIDEV_BASE_REF || env.DENSER_TEST_MAP_BASE || FALLBACK_BASES.find((ref) => {
    try {
      git(['rev-parse', '--verify', '-q', `${ref}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  });
  if (!base) return { paths: null, source: 'git works but no base ref' };
  const forkPoint = git(['merge-base', base, 'HEAD']).trim();
  const paths = new Set([
    ...nulSeparated(git(['diff', '--name-only', '--no-renames', '-z', forkPoint, '--'])),
    ...nulSeparated(git(['ls-files', '--others', '--exclude-standard', '-z']))
  ]);
  return { paths: [...paths].sort(), source: `git diff against ${base} (working tree, untracked files included)` };
}

// ---- the map ------------------------------------------------------------------

class Selection {
  everything = [];
  suites = new Map();
  allSpecs = null;
  specs = new Map();

  widen(why) {
    this.everything.push(why);
  }

  suite(name, why) {
    if (!this.suites.has(name)) this.suites.set(name, why);
  }

  blog(why) {
    for (const name of BLOG_SUITES) this.suite(name, why);
  }

  spec(file, why) {
    this.blog(why);
    if (!this.specs.has(file)) this.specs.set(file, why);
  }

  everySpec(why) {
    this.blog(why);
    this.allSpecs ??= why;
  }

  /** Why `name` runs, or null when nothing selects it. */
  reason(name) {
    return this.everything[0] ?? this.suites.get(name) ?? null;
  }

  /** The fixture specs to run, relative to the repository; null for every spec. */
  specList() {
    if (this.everything.length > 0 || this.allSpecs !== null) return null;
    return [...this.specs.keys()].sort();
  }
}

class TestMap {
  constructor() {
    const sources = SCANNED_ROOTS.flatMap((root) => [...sourceFiles(root)]);
    this.importers = reverseImports(sources);
    this.playwrightSources = sources.filter((file) => BLOG_PLAYWRIGHT.test(file) || WALLET_PLAYWRIGHT.test(file) || SHARED_PLAYWRIGHT.test(file));
    for (const config of sources) this.addConfigPaths(config);
  }

  // A config loads its global setup and teardown by an app-relative string path
  // (`path.join(__dirname, 'playwright/...')`), which counts as an import.
  addConfigPaths(config) {
    const app = config.match(CONFIG)?.[1];
    if (!app) return;
    for (const [, , relative] of fs.readFileSync(config, 'utf8').matchAll(CONFIG_PATH)) {
      const target = `apps/${app}/${relative}`;
      for (const candidate of [target, ...SOURCE_SUFFIXES.map((suffix) => target + suffix)]) {
        if (!this.importers.has(candidate)) this.importers.set(candidate, new Set());
        this.importers.get(candidate).add(config);
      }
    }
  }

  // The Playwright sources naming `literal` as a quoted string, or as the last
  // segment of one.
  naming(literal) {
    const quoted = new RegExp(`(['"\`])(?:[^'"\`\n]*/)?${literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`);
    return this.playwrightSources.filter((source) => quoted.test(fs.readFileSync(source, 'utf8')));
  }

  classify(paths) {
    const selection = new Selection();
    if (paths.length === 0) selection.widen('the change is empty');
    for (const file of paths) this.classifyPath(file, selection);
    return selection;
  }

  classifyPath(file, selection) {
    if (DOCS.some((pattern) => pattern.test(file))) return;
    if (WALLET_PLAYWRIGHT.test(file)) {
      selection.suite(WALLET_SUITE, `${file} is wallet Playwright code`);
      if (isSource(file)) this.reach(file, selection);
      return;
    }
    const recording = file.match(BLOG_RECORDING);
    if (recording) return this.classifyRecording(file, recording[1], selection);
    const snapshots = file.match(BLOG_SNAPSHOTS);
    if (snapshots) return this.reach(snapshots[1], selection);
    if (BLOG_PLAYWRIGHT.test(file) || SHARED_PLAYWRIGHT.test(file)) {
      if (isSource(file)) return this.reach(file, selection);
      return this.classifyData(file, selection);
    }
    if (file.startsWith(`${BLOG_APP_DIR}/`)) {
      selection.everySpec(`${file} is blog app source`);
      selection.suite(LIGHTHOUSE_SUITE, `${file} is blog app source`);
      if (isSource(file)) this.reach(file, selection, { appSource: true });
      return;
    }
    if (file.startsWith('apps/wallet/')) {
      selection.suite(WALLET_SUITE, `${file} is wallet app source`);
      selection.suite(LIGHTHOUSE_SUITE, `${file} is wallet app source`);
      if (isSource(file)) this.reach(file, selection, { appSource: true });
      return;
    }
    selection.widen(`${file} is outside both apps (shared package, config, tooling or unknown)`);
  }

  // What the files importing `file` (transitively) reach. Playwright code, unlike
  // app source (whose entries are routes), must end at entries this map knows.
  reach(file, selection, { appSource = false } = {}) {
    const reached = importerClosure([file], this.importers);
    for (const importer of reached) {
      const why = importer === file ? `${file} changed` : `${importer} imports ${file}`;
      if (FIXTURE_SPEC.test(importer)) {
        if (fs.existsSync(importer)) selection.spec(importer, why);
        else selection.blog(why);
      } else if (importer === FIXTURE_CONFIG) {
        selection.everySpec(why);
      } else if (BLOG_LIVE_SPEC.test(importer)) {
        selection.blog(`${why}; live_e2e runs it on fixture_e2e's build`);
      } else if (WALLET_LIVE_SPEC.test(importer)) {
        selection.suite(WALLET_SUITE, `${why}; live_e2e runs it on wallet_fixture's build`);
      } else if (WALLET_FIXTURE_ENTRY.some((pattern) => pattern.test(importer)) || (importer.startsWith('apps/wallet/') && !WALLET_PLAYWRIGHT.test(importer))) {
        selection.suite(WALLET_SUITE, why);
      } else if (importer.startsWith(`${BLOG_APP_DIR}/`) && !BLOG_PLAYWRIGHT.test(importer)) {
        selection.everySpec(why);
        selection.suite(LIGHTHOUSE_SUITE, why);
      }
      if (importer === LIGHTHOUSE_LOADED) selection.suite(LIGHTHOUSE_SUITE, `${why}; .aidev/fixture-proxy-serve.mjs loads it`);
      const imported = this.importers.get(importer);
      const isEntry = imported === undefined || imported.size === 0;
      if (isEntry && !appSource && !FIXTURE_SPEC.test(importer) && importer !== FIXTURE_CONFIG && !RECOGNISED_ENTRY.some((pattern) => pattern.test(importer))) {
        const from = importer === file ? '' : ` (it imports ${file})`;
        selection.widen(`${importer}${from} is no spec or config and nothing imports it: loaded some other way (a config's string path?)`);
      }
    }
  }

  classifyRecording(file, set, selection) {
    const naming = this.naming(set);
    if (set === LIGHTHOUSE_SET) selection.suite(LIGHTHOUSE_SUITE, `${file} is the Lighthouse pass's recording`);
    else if (naming.length === 0) return selection.widen(`${file}: no Playwright code names the recording '${set}'`);
    for (const source of naming) this.reach(source, selection);
  }

  // A data file selects what the code naming it reaches.
  classifyData(file, selection) {
    const naming = this.naming(path.posix.basename(file));
    if (naming.length === 0) return selection.widen(`${file} is Playwright data no Playwright code names`);
    for (const source of naming) this.reach(source, selection);
  }
}

/** The selection for `paths`; null `paths` (no change information) selects everything. */
export function selectionFor(paths, source) {
  if (paths === null) {
    const selection = new Selection();
    selection.widen(`no change information (${source})`);
    return selection;
  }
  return new TestMap().classify(paths);
}

// ---- the commands -------------------------------------------------------------

function existingFixtureSpecs() {
  return fs
    .readdirSync(FIXTURE_SPEC_DIR)
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => `${FIXTURE_SPEC_DIR}/${name}`)
    .sort();
}

function relativeToBlog(spec) {
  return path.posix.relative(BLOG_APP_DIR, spec);
}

function select(selection, suite, change) {
  if (!MAPPED_SUITES.includes(suite)) {
    console.log(`test-map: no rule for suite ${suite}; it runs`);
    return 2;
  }
  const why = selection.reason(suite);
  if (why !== null) {
    console.log(`selected: ${why}`);
    return 0;
  }
  console.log(`not selected: none of the ${change.paths.length} changed paths (${change.source}) reaches ${suite}`);
  return SELECT_SKIP_EXIT;
}

function printSuites(selection) {
  for (const suite of MAPPED_SUITES) {
    const why = selection.reason(suite);
    console.log(why === null ? `${suite}\tskip` : `${suite}\trun\t${why}`);
  }
  return 0;
}

function printSpecs(selection) {
  const specs = selection.specList() ?? existingFixtureSpecs();
  if (specs.length > 0) console.log(specs.map(relativeToBlog).join('\n'));
  return 0;
}

function printPlan(selection, change) {
  console.log(`test-map: ${change.paths === null ? 0 : change.paths.length} changed paths (${change.source})`);
  if (selection.everything.length > 0) console.log(`test-map: every suite and every fixture spec: ${selection.everything[0]}`);
  printSuites(selection);
  const specs = selection.specList();
  const blogRuns = selection.reason(BLOG_SUITES[0]) !== null;
  console.log('');
  if (!blogRuns) {
    console.log('fixture specs: none — the change reaches no blog fixture spec');
  } else if (specs === null) {
    console.log(`fixture specs: all (${selection.everything[0] ?? selection.allSpecs})`);
    console.log('run: aidev test run --slot full    # the whole slot; its select: skips the suites above');
  } else if (specs.length === 0) {
    console.log(`fixture specs: none (${selection.reason(BLOG_SUITES[0])}); the gate runs the whole suite`);
  } else {
    for (const spec of specs) console.log(`fixture spec: ${relativeToBlog(spec)}\t${selection.specs.get(spec)}`);
    console.log(`run: aidev test run --slot full --suite fixture_e2e -- ${specs.map(relativeToBlog).join(' ')}`);
  }
  if (specs !== null && selection.reason(WALLET_SUITE) !== null) console.log('run: aidev test run --slot full --suite wallet_fixture');
  return 0;
}

function main(argv) {
  const [command, suite] = argv;
  const change = changeInformation(process.env);
  const selection = selectionFor(change.paths, change.source);
  switch (command) {
    case 'select':
      return select(selection, suite, change);
    case 'suites':
      return printSuites(selection);
    case 'specs':
      return printSpecs(selection);
    case 'plan':
    case undefined:
      return printPlan(selection, change);
    default:
      console.error('usage: node .aidev/test-map.mjs [plan | suites | specs | select <suite>]');
      return 64;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  process.exitCode = main(process.argv.slice(2));
}
