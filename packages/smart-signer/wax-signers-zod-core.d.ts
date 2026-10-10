// The zod 4 core of @hiveio/wax-signers-external, aliased by the apps (see wax-signers-zod.js).
declare module 'wax-signers-zod-core' {
  export function config(newConfig: { jitless?: boolean }): unknown;
}
