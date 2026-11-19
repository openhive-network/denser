# Glossary: English (en)

English is the reference locale: `apps/blog/locales/en/common_blog.json`,
`apps/wallet/locales/en/common_wallet.json` and
`packages/smart-signer/locales/en/smart-signer.json`. The other glossaries
translate the terms below. Status values and how to use this file:
`.aidev/i18n/README.md`.

## Terms

| Term | Status | Notes |
|---|---|---|
| Safe Storage | unreviewed | The browser's password-protected key store. Capitalised as a name in labels ("Safe Storage"), lower case in running text ("in safe storage"). |
| Hive Keychain / Keychain | unreviewed | Product name. |
| witness / witnesses | unreviewed | Never "delegate", which is a delegation. |
| voters | unreviewed | People who voted for a witness or proposal ("Voters" link, voters dialog). |
| votes remaining | unreviewed | "You have 1 vote remaining" style, plural keys with `{{count}}`; zero has its own key. |
| remove a witness vote | unreviewed | "Remove your vote for witness @X" (#1673), "Remove your vote for @X?" (#1662). |
| proposal / proposals | unreviewed | DHF funding proposals. |
| Unfunded | unreviewed | A proposal the DHF does not pay at the current ranking. "(never funded)", phone "(never)". |
| Up to … left | unreviewed | "Up to <amount/> left": the most a proposal can still be paid. |
| refund | unreviewed | The DHF's return proposal. |
| delegation / delegate | unreviewed | Lending HIVE POWER or RC to another account. Revoking one: "Revoke". |
| power up / power down | unreviewed | Verb form "power up" in text, button "Power Up" / "Power Down". |
| HIVE, HBD, HIVE POWER, HP | unreviewed | Token symbols. An amount already ending in "HIVE POWER" takes no extra "HIVE" (#1188). |
| payout / after payout | unreviewed | The post's reward payment, seven days after posting. "+1 vote after payout (not counted)". |
| rewards / claim rewards | unreviewed | "Claim rewards", button "Redeem". |
| curation rewards / author rewards | unreviewed | |
| beneficiary | unreviewed | An account receiving a share of a post's author rewards. |
| posting / active / owner / memo key | unreviewed | Lower case in sentences ("your active key"); title case in key-page headings ("Owner Key"). Other locales keep the key names Posting, Active, Owner, Memo recognisable (#1603). |
| Keys & Permissions / Authorities | unreviewed | Two separate wallet tabs; translations must keep them distinct (#1188). |
| memo | unreviewed | The transfer message. "#" at the start encrypts it. |
| transfer / savings | unreviewed | |
| price feed | unreviewed | The HBD price a witness publishes. |
| proxy | unreviewed | An account that votes for witnesses on the user's behalf. |
| Resource Credits (RC) | unreviewed | |
| upvote / downvote | unreviewed | |
| follow / mute / reblog | unreviewed | |
| community | unreviewed | |
| post / comment / reply | unreviewed | |
| log in / log out | unreviewed | Labels: "Login", "Logout". |
| forget a saved key | unreviewed | Removes a key saved in this browser without signing out: "Forget saved key", "Forget it and sign out" (#1703). |
| passkey | unreviewed | |
| This session (key badge) | unreviewed | Marks the keys the signed-in session signs with. |
| recovery account | unreviewed | |

## Register

Second person, plain and direct ("Your vote", "Enter your active key").
Gender-neutral. Sentence case for messages and descriptions; short labels
and buttons often use title case ("Power Up", "Decline Payout") — keep the
form a sibling label already uses.

## Plural forms

Categories: `one`, `other`.

| Category | Example |
|---|---|
| one | 1 voter / +1 vote after payout (not counted) |
| other | 0 voters, 5 voters / +5 votes after payout (not counted) |

Every count shown to the user goes through a plural key with `{{count}}`,
even in English, so the other locales get their own categories (#1188).

## Numbers, dates and times

- Decimal point, comma grouping: "1,234.5", "12,000.000 HBD".
- Abbreviated amounts: "651.7K", "1.23M", "12K" (trailing zeros dropped,
  #1684).
- Dates: "May 15, 2026" (`Intl.DateTimeFormat`).
- Times: 12-hour, "2:05 PM".
- Relative times from `Intl.RelativeTimeFormat`: "5 hours ago", "yesterday";
  narrow "5h ago".
- Percent: "12.5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, CSV, API; HIVE, HBD, HP, HIVE POWER. These names stay as they
are in every locale (`identicalToEnglishAllowed` in
`scripts/check-blog-translations.js` and `scripts/check-wallet-translations.js`
lists the keys that may equal English).
