/**
 * RFC 8785 (JSON Canonicalization Scheme) serializer, restricted to the profile the
 * L2 framework signs: objects, arrays, strings, booleans, null and *safe integers*
 * only (|n| <= 2^53-1). Floats, unsafe integers, bigints and undefined are rejected;
 * carry such values as strings. Mirrors hive_fork_manager/shared_lib/l2_jcs.cpp, so
 * the browser and the HAF verifier canonicalize to identical bytes.
 *
 * Object keys are sorted by UTF-16 code units (RFC 8785 §3.2.3), which is what
 * JavaScript's default string comparison does.
 */
export type JcsValue = string | number | boolean | null | JcsValue[] | JcsObject;
export type JcsObject = { [key: string]: JcsValue };

export class JcsError extends Error {
  constructor(message: string) {
    super(`L2 JCS: ${message}`);
    this.name = 'JcsError';
  }
}

/** Canonical (RFC 8785) JSON text for `value`. Throws JcsError on unsupported values. */
export function canonicalize(value: unknown): string {
  return serialize(value, '$');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serialize(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return serializeNumber(value, path);
  if (Array.isArray(value)) {
    return `[${value.map((item, i) => serialize(item, `${path}[${i}]`)).join(',')}]`;
  }
  if (isRecord(value)) return serializeObject(value, path);
  throw new JcsError(`unsupported value of type ${typeof value} at ${path}`);
}

function serializeNumber(n: number, path: string): string {
  if (!Number.isInteger(n)) {
    throw new JcsError(`floating-point numbers are not allowed at ${path}; carry decimals as strings`);
  }
  if (!Number.isSafeInteger(n)) {
    throw new JcsError(`integer at ${path} is outside the safe range +-(2^53-1); carry large values as strings`);
  }
  return Object.is(n, -0) ? '0' : String(n);
}

function serializeObject(obj: Record<string, unknown>, path: string): string {
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => {
    const item = obj[key];
    if (item === undefined) throw new JcsError(`undefined is not allowed at ${path}.${key}`);
    return `${JSON.stringify(key)}:${serialize(item, `${path}.${key}`)}`;
  });
  return `{${parts.join(',')}}`;
}
