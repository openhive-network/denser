export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `raw` parsed as a JSON object; missing, unparseable or non-object JSON yields `{}`. */
export function parseJsonObject(raw: string | undefined): JsonObject {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
