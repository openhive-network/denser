/**
 * Path of a route of the app's own API, under the base path the app is served at.
 * Next.js adds the base path to `<Link>` and router navigation but not to `fetch`.
 * Reads NEXT_PUBLIC_BASE_PATH, the build-time value next.config.js takes `basePath` from,
 * rather than the runtime REACT_APP_BASE_PATH, which can differ from what Next.js routes.
 * @param path - API path with a leading slash (`/api/auth/switch`)
 * @returns The path under the base path (`/blog/api/auth/switch`)
 */
export function appApiPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
}
