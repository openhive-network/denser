# Full Testing Suite

Run comprehensive tests for significant changes.

## Steps to execute:

1. **Build all apps**
   ```bash
   pnpm build:blog
   pnpm build:wallet
   ```

2. **Run linters**
   ```bash
   pnpm lint
   ```

3. **Validate translations**
   ```bash
   pnpm --filter @hive/blog lint:translations
   pnpm --filter @hive/blog lint:translations:usage
   ```

4. **Run E2E tests** (if available)
   ```bash
   pnpm blog:pw:test:local:chromium
   ```

Report any failures with file paths and error messages. Fix critical issues before proceeding.
