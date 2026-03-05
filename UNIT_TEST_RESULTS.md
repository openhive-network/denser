# Unit Test Results

Date: 2026-03-02  
Workspace: `d:\Denser`  
Shell: PowerShell (Windows)

## Scope Executed

- `packages/renderer/src/**/*.test.ts`
- `packages/transaction/lib/validation/__tests__/*.test.ts`
- `packages/ui/lib/sanitize-url.test.ts`
- `packages/ui/lib/html-escape-json.test.ts`

Playwright e2e specs were not included because they are end-to-end tests, not unit tests.

## Environment Preparation

- Installed dependencies:
  - Command: `corepack pnpm install`
  - Result: success

## Execution Results

1. Workspace default unit-test command
- Command: `corepack pnpm -r --if-present test`
- Result: failed
- Reason: `packages/renderer` test script uses POSIX inline env assignment (`TS_NODE_PROJECT=...`) which is not valid in Windows shell.

2. Renderer tests (manual Windows-compatible invocation)
- Command:
  - `cd packages/renderer`
  - `$env:TS_NODE_PROJECT='tsconfig.test.json'`
  - `corepack pnpm exec mocha 'src/**/*.test.ts'`
- Result: success
- Summary: `1357 passing`, `9 pending`

3. Transaction validation unit tests
- Command:
  - `$env:TS_NODE_TRANSPILE_ONLY='1'`
  - `$env:TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"NodeNext"}'`
  - `corepack pnpm exec mocha -r ts-node/register 'packages/transaction/lib/validation/__tests__/*.test.ts'`
- Result: success
- Summary: `47 passing`

4. UI sanitize-url unit tests
- Command:
  - `$env:TS_NODE_TRANSPILE_ONLY='1'`
  - `$env:TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"NodeNext"}'`
  - `corepack pnpm exec mocha -r ts-node/register 'packages/ui/lib/sanitize-url.test.ts'`
- Result: success
- Summary: `86 passing`

5. UI html-escape-json unit tests (direct Mocha)
- Command:
  - `$env:TS_NODE_TRANSPILE_ONLY='1'`
  - `$env:TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"NodeNext"}'`
  - `corepack pnpm exec mocha -r ts-node/register 'packages/ui/lib/html-escape-json.test.ts'`
- Result: failed
- Summary: `0 passing`, `13 failing`
- Reason: test file expects a Jest/Vitest-style global `expect` with `toBe`/`toContain`, but no such global is configured in current Mocha setup.

6. UI html-escape-json unit tests (compat preload, no repo code changes)
- Command:
  - same as #5, plus temporary preload defining `global.expect` compatibility methods for this test run
- Result: success
- Summary: `13 passing`

## Final Status

- Unit test logic status: **OK** (all executed unit assertions pass with compatible runner setup).
- Runner/script status: **not fully OK** on Windows using default commands.

### Remaining harness issues to fix (optional)

1. Make `packages/renderer` test script cross-platform (use `cross-env` or equivalent).
2. Standardize runner for `packages/ui/lib/html-escape-json.test.ts` (Mocha + setup file, or migrate to a configured Jest/Vitest runner).

## 2026-03-05 Wallet Sidechain Verification

Scope: wallet-side Hive-Engine token balance/history implementation and shared sidechain helper updates.

1. ESLint (touched files)
- Command:
  - `corepack pnpm exec eslint packages/ui/lib/sidechain-rewards.ts apps/wallet/app/client-effects.tsx apps/wallet/components/site-header.tsx apps/wallet/components/transfers-history-filter.tsx apps/wallet/components/main-nav.tsx apps/wallet/components/wallet-menu.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx apps/wallet/feature/transfers-page/account-history.tsx apps/wallet/feature/transfers-page/history-table.tsx apps/wallet/feature/transfers-page/lib/utils.ts apps/wallet/feature/transfers-page/sidechain-history-table.tsx apps/wallet/feature/transfers-page/hooks/use-sidechain-account-transactions.ts`
- Result: success (0 errors, warnings only)

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 Sidechain Token Actions Verification

1. ESLint (token-action implementation files)
- Command:
  - `corepack pnpm exec eslint packages/transaction/index.ts apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx packages/ui/lib/sidechain-rewards.ts`
- Result: success (warnings only, no errors)

2. ESLint (dialog follow-up)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx`
- Result: success

3. TypeScript (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

4. TypeScript (transaction package direct)
- Command:
  - `corepack pnpm exec tsc --noEmit -p packages/transaction/tsconfig.json`
- Result: failed due to pre-existing workspace/module-resolution issues unrelated to this task (missing declaration for `hive-auth-client`, unresolved `@transaction/lib/chain` from `packages/smart-signer`).

Status: wallet-side changes compile cleanly and pass lint error gates.

## 2026-03-05 Wallet UI Patch Verification

1. ESLint (wallet UI patch files)
- Command:
  - `corepack pnpm exec eslint apps/wallet/components/site-header.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx apps/wallet/feature/transfers-page/sidechain-wallet-reward.tsx`
- Result: success (warnings only, no errors)

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 Wallet Sidechain Signer Fix Verification

1. ESLint (signer-fix touched files)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts packages/transaction/index.ts`
- Result: success (no errors)

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 Loader Accent Patch Verification

1. ESLint (shared loader component)
- Command:
  - `corepack pnpm exec eslint packages/ui/components/loading.tsx`
- Result: success

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 Wallet Post-Tx Refetch Fix Verification

1. ESLint (post-tx mutation hook)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts`
- Result: success

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 Instant Post-Success Wallet Update Verification

1. ESLint (token action mutation hook)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts`
- Result: success

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-05 No-Flicker Stabilization Verification

1. ESLint (token action mutation hook)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts`
- Result: success

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-06 TODO Batch A-F Verification

1. ESLint (touched implementation files)
- Command:
  - `corepack pnpm exec eslint apps/blog/app/layout.tsx apps/wallet/app/layout.tsx packages/ui/lib/sidechain-rewards.ts apps/wallet/feature/transfers-page/wallet-balances-table.tsx apps/wallet/feature/transfers-page/account-history.tsx apps/wallet/feature/transfers-page/sidechain-history-table.tsx apps/wallet/feature/transfers-page/hooks/use-sidechain-token-action-mutation.ts apps/wallet/feature/transfers-page/sidechain-token-action-dialog.tsx apps/wallet/feature/transfers-page/delegate-rc-dialog.tsx apps/wallet/feature/transfers-page/rewards-banner.tsx apps/wallet/feature/transfers-page/pending-savings-withdrawals.tsx apps/wallet/feature/transfers-page/rc-row.tsx apps/wallet/feature/delegations/rc-row.tsx apps/wallet/feature/delegations/rc-table.tsx apps/wallet/components/revoke-dialog.tsx apps/wallet/components/transfer-dialog.tsx apps/wallet/components/witnesses-list-item.tsx`
- Result: success (warnings only, no errors)

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

3. TypeScript check (blog app)
- Command:
  - `corepack pnpm -C apps/blog exec tsc --noEmit`
- Result: failed due pre-existing unrelated type issue in:
  - `features/post-rendering/votes-details-data.tsx` (`style` prop on `BasePathLinkProps`)

## 2026-03-06 Follow-up Verification (TX format + unstake schedule detail)

1. ESLint (follow-up touched files)
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/sidechain-history-table.tsx apps/wallet/feature/transfers-page/wallet-balances-table.tsx`
- Result: success (warnings only, no errors)

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success

## 2026-03-06 Distribution Label Mapping Verification

1. ESLint
- Command:
  - `corepack pnpm exec eslint apps/wallet/feature/transfers-page/sidechain-history-table.tsx`
- Result: success

2. TypeScript check (wallet app)
- Command:
  - `corepack pnpm -C apps/wallet exec tsc --noEmit`
- Result: success
