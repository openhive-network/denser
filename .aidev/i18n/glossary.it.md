# Glossary: Italian (it)

Applies to `apps/blog/locales/it/common_blog.json`,
`apps/wallet/locales/it/common_wallet.json` and
`packages/smart-signer/locales/it/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Italian strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19.

## Terms

| English | Italian | Status | Notes |
|---|---|---|---|
| Safe Storage | archivio sicuro | unreviewed | Masculine: "nell'archivio sicuro", "Usa l'archivio sicuro"; label "Archivio sicuro" (#1698). |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Usa Keychain". |
| witness / witnesses | witness | unreviewed | Kept in English in 33 of 37 strings: "Witness". |
| voters | votanti | unreviewed | |
| proposal / proposals | proposta / proposte | unreviewed | |
| Unfunded | Non finanziato; phone "Non finanz." | unreviewed | |
| Up to … left | Fino a <amount/> rimanenti | unreviewed | |
| refund (proposal) | rimborso | unreviewed | |
| delegation / delegate | delega / delegare | unreviewed | "Deleghe", button "Delega". |
| power up / power down | Fai Power Up / Fai Power Down | unreviewed | |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | pagamento / dopo il pagamento | unreviewed | 23 of 23 strings. |
| rewards / claim rewards | ricompense / Riscatta ricompense | unreviewed | |
| curation rewards | ricompense da curatore | unreviewed | |
| beneficiary | beneficiario | unreviewed | |
| posting / active / owner / memo key | chiave di pubblicazione / chiave attiva / chiave Owner / chiave Memo | unreviewed | Owner is a tie: 10 strings "Owner", 10 "proprietario". |
| Keys & Permissions / Authorities | Chiavi e permessi / Autorità | unreviewed | |
| memo | memo | unreviewed | |
| transfer | trasferire / trasferimento | unreviewed | |
| savings | risparmi | unreviewed | |
| price feed | feed del prezzo | unreviewed | |
| proxy | proxy | unreviewed | |
| Resource Credits (RC) | Crediti Risorse (RC) | unreviewed | |
| upvote / downvote | voto positivo / voto negativo | unreviewed | |
| follow / mute | seguire / silenziare | unreviewed | Mute: 27 of 31 strings use "silenzia-". |
| reblog | ricondividere ("Ricondividi") | unreviewed | |
| community | comunità | unreviewed | |
| community subscribers | iscritti | unreviewed | #1717 |
| post / comment / reply | post / commento / risposta | unreviewed | "post" in 93 of 114 strings. |
| wallet | portafoglio | unreviewed | 24 strings; 18 keep "wallet". |
| log in / log out | Accedi / Esci | unreviewed | |
| forget a saved key | dimenticare la chiave salvata | unreviewed | "Dimentica la chiave salvata", "Dimenticala ed esci" (#1703). |
| password | password | unreviewed | |
| passkey | passkey | unreviewed | Kept as the product term. |
| market / interest | mercato / interessi | unreviewed | |
| this session (key badge) | Questa sessione | unreviewed | |
| recovery account | account di recupero | unreviewed | |
| unmute | riattiva | unreviewed | Button "Riattiva", as `communities.unmute_post_comment` (#1698). |

## Register

Informal "tu": "Rimuovendo il tuo voto azzererai le tue ricompense" (no "Lei"
forms).

## Plural forms

Categories: `one`, `many`, `other`.

| Category | Numbers | Example |
|---|---|---|
| one | 1 | 1 votante |
| many | 1 000 000, 2 000 000, … | 1 000 000 di votanti |
| other | 0, 2–999 999, fractions | 5 votanti |

## Numbers, dates and times

- Decimal comma, period grouping from five digits: "1234,5",
  "1.234.567,891".
- Abbreviated amounts: the app's K/M suffix with the decimal comma, "651,7K".
- Dates: "15 mag 2026", long "15 maggio 2026". Month names lower case.
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "5 ore fa", "ieri".
- Percent: "12,5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER; Witness, passkey, post, blog,
feed, backup.

## Known drift

Strings that do not follow the glossary yet:

- witness: the glossary keeps "witness", and the blog's and wallet's strings now do (#1698); a native reviewer may still prefer "testimone".
