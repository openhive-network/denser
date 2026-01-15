# Quick Testing

Run minimal tests for minor changes (single-file fixes, style changes, typos).

## Steps to execute:

1. **Lint affected package** (choose based on changes):
   ```bash
   # For blog changes
   pnpm --filter @hive/blog lint

   # For wallet changes
   pnpm --filter @hive/wallet lint

   # For UI package changes
   pnpm --filter @hive/ui lint
   ```

2. **Type check** (if TypeScript files changed):
   ```bash
   # For blog
   pnpm --filter @hive/blog exec tsc --noEmit

   # For wallet
   pnpm --filter @hive/wallet exec tsc --noEmit
   ```

Report any lint warnings or type errors found.
