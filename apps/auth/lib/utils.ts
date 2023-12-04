export function parseCookie(cookie: string): Record<string, string> {
  const kv: Record<string, string> = {};

  if (!cookie) return kv;

  cookie.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    kv[k] = v;
  });

  return kv;
}
