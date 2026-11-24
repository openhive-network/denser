# Recorded safe-storage wallets

`pre-setting-wallet.json` is the IndexedDB of a safe-storage wallet made by `@hiveio/hb-auth`
1.28.4-rc0-stable.261028220752, the build pinned before the check before active-key operations
existed: its beekeeper wallet has no protected-setting marker key and there is no setting record.
It holds `gtg`'s fixture key `5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR` (of no real
account) as posting and active key, under the password `fixture-password`.
`../../fixture/activeCheck.spec.ts` restores it into a fresh browser context.

Re-record it, with network access to gitlab.syncad.com and the workspace installed, from the
repository root: `node apps/wallet/playwright/record-pre-setting-wallet.ts`. The script fetches that
hb-auth build from the registry into a temporary directory, outside the catalog and lockfile.
