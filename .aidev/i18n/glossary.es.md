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
| vote weight / downvote power | peso del voto / poder de voto negativo | unreviewed | |
| follow / mute | seguir / silenciar | unreviewed | Mute: 29 of 31 strings use "silenciar". |
| reblog | rebloguear | unreviewed | |
| community | comunidad | unreviewed | |
| community subscribers | suscriptores | unreviewed | #1717 |
| post / comment / reply | publicación / comentario / respuesta | unreviewed | "publicación" in 95 of 114 strings. |
| wallet | billetera | unreviewed | Feminine: "tu billetera", "Billetera no encontrada" (#1698). |
| log in / log out | Iniciar sesión / Cerrar sesión | unreviewed | |
| forget a saved key | olvidar la clave guardada | unreviewed | "Olvidar la clave guardada", "Olvidarla y cerrar sesión" (#1703). |
| password | contraseña | unreviewed | |
| passkey | passkey | unreviewed | Kept as the product term. |
| biometric unlock | desbloqueo biométrico | unreviewed | As in `login_form.passkey_prompt.*`. |
| password manager | gestor de contraseñas | unreviewed | `passkey_unlock.turn_off_description` (#1774). Turning biometric unlock off: „Desactivar el desbloqueo biométrico”. |
| check before active-key operations | Preguntar antes de cada operación con la clave activa; "Confirma con tu contraseña o passkey" | unreviewed | `active_check.*`, `password_form.active_check_*` (#1513). |
| market / interest | mercado / intereses | unreviewed | |
| this session (key badge) | Esta sesión | unreviewed | |
| recovery account | cuenta de recuperación | unreviewed | |
| block explorer | explorador de bloques | unreviewed | "Abrir en exploradores de bloques" (#1698). |
| unmute | dejar de silenciar | unreviewed | Button "Dejar de silenciar" (#1698). |
| notification / notifications | notificación / notificaciones | unreviewed | Toast announcement label "Notificación", region "Notificaciones ({hotkey})" (#1739). |
| Hive core (API set) | Núcleo de Hive | unreviewed | API-set title (#1747); the API names in brackets (database, condenser, broadcast) stay English. |
| lite accounts | cuentas lite | unreviewed | As in the lite-account strings; API-set title (#1747). |
| posting authority (of a lite account) | autoridad de publicación | unreviewed | The gateway's `auth_failed` on an edit or delete (#1777). |
| Balance API | API de saldos | unreviewed | API-set title (#1747). Bridge, Hivemind REST, HAfAH and HiveSense are API names, not translated. |
| For You feed | feed Para ti | unreviewed | As in the For You feed strings; API-set title (#1747). |
| API node / API set panel | nodo (de API); familia de APIs | unreviewed | /healthchecker (#1725): "Servidores de API por familia de APIs", node states "apto", "no compatible", "caído", "desconocido", "degradado"; "Elección automática", "Predeterminado", "En uso". |

## Register

Informal "tú": "Tu borrador", "tu voto" (123 uses of "tu" against 3 of
"usted"). Do not mix in "usted" forms. The smart-signer strings moved from
"usted" to "tú" in #1698.

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

None known. #1727 removed the unused `login_form.*hbauth*` keys listed here before.
