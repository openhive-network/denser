/**
 * Named test timeouts, which a run under AIDEV may stretch on a loaded host, and the
 * observations those stretches are learnt from.
 *
 * AIDEV_TIMEOUTS_FILE, when set, names a JSON file of resolved timeouts:
 *
 *   {"version": 1, "scale": 1.4, "actions": {"navigation": {"timeout_ms": 42000}}}
 *
 * An action listed there gets its `timeout_ms`; any other gets its default times `scale`. Neither
 * goes below the default. Without the file (a developer's machine, plain CI), or with one that
 * cannot be read, every timeout is its default.
 *
 * Each completed timed action is appended as one JSON line to AIDEV_TIMEOUTS_OBSERVATIONS
 * (default: DEFAULT_OBSERVATIONS_PATH under the repository root). A wait that times out or throws
 * is not recorded: its duration is only a lower bound, and would bias the model low.
 *
 * The Playwright configs and support code import this, and so do the `.aidev/run-*.sh` runners
 * through `node -e`: it uses node built-ins only, and TypeScript that node's type stripping runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export const DEFAULT_OBSERVATIONS_PATH = 'test-results/timeouts/observations.jsonl';

const SUPPORTED_VERSION = 1;

export interface TestTimeouts {
  /** The timeout of action `name`, in ms; never below `defaultMs`. */
  testTimeout(name: string, defaultMs: number): number;
  /** Appends a completed action's duration to the observations file. */
  recordTimedAction(name: string, durationMs: number, defaultMs: number): void;
  /**
   * Runs `run` with action `name`'s timeout and records its duration once it resolves. A
   * rejection propagates unrecorded.
   */
  timed<T>(name: string, defaultMs: number, run: (timeoutMs: number) => Promise<T>): Promise<T>;
}

type Env = Record<string, string | undefined>;

interface ResolvedTimeouts {
  scale: number;
  actions: Map<string, number>;
}

const DEFAULTS_ONLY: ResolvedTimeouts = { scale: 1, actions: new Map() };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** The file's timeouts, or a reason it cannot be used. */
function parseTimeoutsFile(text: string): ResolvedTimeouts | string {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  if (!isRecord(data)) return 'not a JSON object';
  if (data.version !== SUPPORTED_VERSION) return `unsupported version ${JSON.stringify(data.version)}`;
  const scale = data.scale ?? 1;
  if (!isPositiveNumber(scale)) return `scale ${JSON.stringify(data.scale)} is not a positive number`;
  const rawActions = data.actions ?? {};
  if (!isRecord(rawActions)) return 'actions is not an object';
  const actions = new Map<string, number>();
  for (const [name, entry] of Object.entries(rawActions)) {
    if (!isRecord(entry) || !isPositiveNumber(entry.timeout_ms)) {
      return `actions.${name}.timeout_ms is not a positive number`;
    }
    actions.set(name, entry.timeout_ms);
  }
  return { scale, actions };
}

/** The nearest directory at or above `start` holding pnpm-workspace.yaml, else `start`. */
function findRepositoryRoot(start: string): string {
  for (let dir = start; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    if (path.dirname(dir) === dir) return start;
  }
}

/**
 * The timeouts `env` describes. The file is read on the first `testTimeout` call, once; a missing
 * or malformed file, or an unwritable observations file, is reported once through `warn`.
 */
export function createTestTimeouts(
  env: Env = process.env,
  warn: (message: string) => void = (message) => console.warn(message)
): TestTimeouts {
  let resolved: ResolvedTimeouts | undefined;
  let observationsWarned = false;

  const load = (): ResolvedTimeouts => {
    const file = env.AIDEV_TIMEOUTS_FILE;
    if (!file) return DEFAULTS_ONLY;
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (error) {
      warn(`AIDEV_TIMEOUTS_FILE ${file} cannot be read, using default timeouts: ${String(error)}`);
      return DEFAULTS_ONLY;
    }
    const parsed = parseTimeoutsFile(text);
    if (typeof parsed === 'string') {
      warn(`AIDEV_TIMEOUTS_FILE ${file} is malformed (${parsed}), using default timeouts`);
      return DEFAULTS_ONLY;
    }
    return parsed;
  };

  const testTimeout = (name: string, defaultMs: number): number => {
    resolved ??= load();
    const fromFile = resolved.actions.get(name) ?? Math.round(defaultMs * resolved.scale);
    return Math.max(defaultMs, fromFile);
  };

  const recordTimedAction = (name: string, durationMs: number, defaultMs: number): void => {
    const file = path.resolve(
      env.AIDEV_TIMEOUTS_OBSERVATIONS || path.join(findRepositoryRoot(process.cwd()), DEFAULT_OBSERVATIONS_PATH)
    );
    const line = JSON.stringify({ action: name, duration_ms: Math.round(durationMs), default_ms: defaultMs });
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // One short appended line per write, so parallel workers do not interleave.
      fs.appendFileSync(file, `${line}\n`);
    } catch (error) {
      // An observation only feeds the timeout model; losing one must not fail the test it timed.
      if (observationsWarned) return;
      observationsWarned = true;
      warn(`timeout observations cannot be written to ${file}: ${String(error)}`);
    }
  };

  const timed = async <T>(name: string, defaultMs: number, run: (timeoutMs: number) => Promise<T>): Promise<T> => {
    const timeoutMs = testTimeout(name, defaultMs);
    const start = performance.now();
    const result = await run(timeoutMs);
    recordTimedAction(name, performance.now() - start, defaultMs);
    return result;
  };

  return { testTimeout, recordTimedAction, timed };
}

/** This process's timeouts, from its environment. */
export const { testTimeout, recordTimedAction, timed } = createTestTimeouts();
