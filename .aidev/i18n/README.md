# Translation glossaries

One file per shipped locale, `glossary.<lang>.md`. Each covers all three
translation sets that ship the language:

| Locale | Blog (`apps/blog/locales`) | Wallet (`apps/wallet/locales`) | Smart-signer (`packages/smart-signer/locales`) |
|---|---|---|---|
| ar | yes | — | — |
| en | yes (reference) | yes (reference) | yes (reference) |
| es, fr, it, ja, ko, pl, ru, zh | yes | yes | yes |

## How to use them

- Before adding or changing a string in a locale, read that locale's glossary
  and use its term for every concept it lists, in every app. A string that
  needs a term the glossary does not list: pick the rendering the locale files
  already use most and add it to the glossary as `unreviewed` in the same
  change.
- Follow the register, plural and number/date sections as well as the terms.
  Plurals are i18next keys (`key_one`, `key_few`, ...) with exactly the
  categories the locale's `Intl.PluralRules` defines
  (`scripts/translation-validator.js` enforces this). Numbers, dates and
  relative times come from `Intl` with the page locale, not from translated
  fragments.
- A string listed under "Known drift" does not follow the glossary yet. Fix it
  when you touch it, or in the debt sweep; do not copy it.

## Status

- `agreed`: a native-speaker tester corrected or confirmed it; the issue is
  named. Change it only with a new tester decision, and record that issue.
- `unreviewed`: the rendering the locale files use most today, as seeded on
  2026-11-19. Nobody has reviewed it; a reviewer may replace it. When one
  does, mark the row `agreed` with the issue.

English (`glossary.en.md`) is the source wording the other glossaries
translate.
