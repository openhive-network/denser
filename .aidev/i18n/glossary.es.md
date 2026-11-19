# Glossary: Spanish (es)

Applies to `apps/blog/locales/es/common_blog.json`,
`apps/wallet/locales/es/common_wallet.json` and
`packages/smart-signer/locales/es/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Spanish strings yet (#1211 asked for that
review), so every term is `unreviewed`: the rendering the locale files use
most as of 2026-11-19.

## Terms

| English | Spanish | Status | Notes |
|---|---|---|---|
| Safe Storage | almacenamiento seguro | unreviewed | 37 of 37 strings. Label: "Almacenamiento seguro". |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Usar Keychain". |
| witness / witnesses | testigo / testigos | unreviewed | 35 of 37 strings: "Página de testigos". |
| voters | votantes | unreviewed | |
| proposal / proposals | propuesta / propuestas | unreviewed | |
| Unfunded | Sin financiar; phone "Sin financ." | unreviewed | |
| Up to … left | Hasta <amount/> restantes | unreviewed | |
| refund (proposal) | reembolso | unreviewed | |
| delegation / delegate | delegación / delegar | unreviewed | "Delegaciones", "Delegar". |
| power up / power down | Power Up / Power Down | unreviewed | Kept in English in buttons; running text may explain ("aumentar"). |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | pago / después del pago | unreviewed | 23 of 23 strings: "Rechazar pago", "+1 voto después del pago (no contado)". |
| rewards / claim rewards | recompensas / Canjear recompensas | unreviewed | Button "Canjear". |
| curation rewards | recompensas de curación | unreviewed | |
| beneficiary | beneficiario | unreviewed | |
| posting / active / owner / memo key | clave de publicación / clave activa / clave de propietario / clave de memo | unreviewed | |
| Keys & Permissions / Authorities | Claves y permisos / Autoridades | unreviewed | |
| memo | memo | unreviewed | |
| transfer | transferir / transferencia | unreviewed | |
| savings | ahorros | unreviewed | |
| price feed | precio publicado | unreviewed | "Sin precio publicado". |
| proxy | proxy | unreviewed | |
| Resource Credits (RC) | Créditos de Recursos (RC) | unreviewed | |
| upvote / downvote | voto positivo / voto negativo | unreviewed | |
| follow / mute | seguir / silenciar | unreviewed | Mute: 29 of 31 strings use "silenciar". |
| reblog | rebloguear | unreviewed | |
| community | comunidad | unreviewed | |
| post / comment / reply | publicación / comentario / respuesta | unreviewed | "publicación" in 95 of 114 strings. |
| wallet | billetera | unreviewed | 20 strings; 11 say "monedero" (see drift). |
| log in / log out | Iniciar sesión / Cerrar sesión | unreviewed | |
| forget a saved key | olvidar la clave guardada | unreviewed | "Olvidar la clave guardada", "Olvidarla y cerrar sesión" (#1703). |
| password | contraseña | unreviewed | |
| passkey | passkey | unreviewed | Kept as the product term. |
| market / interest | mercado / intereses | unreviewed | |
| this session (key badge) | Esta sesión | unreviewed | |
| recovery account | cuenta de recuperación | unreviewed | |

## Register

Informal "tú": "Tu borrador", "tu voto" (123 uses of "tu" against 3 of
"usted"). Do not mix in "usted" forms.

## Plural forms

Categories: `one`, `many`, `other`.

| Category | Numbers | Example |
|---|---|---|
| one | 1 | 1 votante |
| many | 1 000 000, 2 000 000, … | 1 000 000 de votantes |
| other | 0, 2–999 999, fractions | 5 votantes |

## Numbers, dates and times

- Decimal comma, period grouping from five digits: "1234,5",
  "1.234.567,891".
- Abbreviated amounts: the app's K/M suffix with the decimal comma, "651,7K".
- Dates: "15 may 2026", long "15 de mayo de 2026". Month names lower case.
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "hace 5 horas", "ayer".
- Percent: "12,5 %".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER; passkey, blog, feed.

## Known drift

- mute: blog `user_profile.mute_button` "Mudo" and `unmute_button` "Un mudo"
  (should use "silenciar").
- wallet: "monedero" (blog `navigation.profile_navbar.wallet`) against
  "billetera".
- wallet `witnesses_page.witness` (a single witness) reads "Testigos".
- wallet `profile.savings_title` "AHORROS" in capitals.
- "Almacenamiento Seguro" in title case in the login-method labels.
- blog `navigation.profile_notifications_tab_navbar.redeem` "Canjear" vs
  "reclamar" in some claim texts.
