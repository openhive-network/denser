# Glossary: French (fr)

Applies to `apps/blog/locales/fr/common_blog.json`,
`apps/wallet/locales/fr/common_wallet.json` and
`packages/smart-signer/locales/fr/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the French strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19. The
`agreed` rows were decided for #1727 after comparing hive.blog, the Hive
wallet, Ecency and PeakD; a native speaker may still refine them.

## Terms

| English | French | Status | Notes |
|---|---|---|---|
| Safe Storage | stockage sécurisé | unreviewed | 37 of 37 strings. Label: "Stockage sécurisé". |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Utiliser Keychain". |
| witness / witnesses | témoin / témoins | unreviewed | 35 of 37 strings. |
| voters | votants | unreviewed | |
| proposal / proposals | proposition / propositions | unreviewed | |
| Unfunded | Non financé | unreviewed | |
| Up to … left | Jusqu'à <amount/> restants | unreviewed | |
| refund (proposal) | remboursement | unreviewed | |
| delegation / delegate | délégation / déléguer | unreviewed | |
| power up / power down | Power Up / Power Down | unreviewed | Kept in English in buttons. |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout (the event) / after payout | paiement / après le paiement | agreed (#1727) | "Paiement dans 7 jours", "Refuser le paiement", "Paiement refusé". |
| rewards / payout (amounts earned) | gains | agreed (#1727) | "Gains", "Gains en attente", "Gains d'auteur", "Gains maximaux acceptés", "Aucun gain en attente". Not "récompenses" outside curation rewards. |
| claim rewards | Réclamer les gains | agreed (#1727) | |
| curation rewards | récompenses de curation | agreed (#1727) | "Récompenses de curation", "Récompense de curation pour :". |
| beneficiary | bénéficiaire | unreviewed | |
| posting / active / owner / memo key | clé de publication / clé active / clé propriétaire / clé mémo | unreviewed | |
| Keys & Permissions / Authorities | Clés et permissions / Autorités | unreviewed | |
| memo | mémo | unreviewed | 18 of 28 strings; the rest "memo". |
| transfer | transférer / transfert | unreviewed | |
| savings | épargne | unreviewed | |
| price feed | flux de prix | unreviewed | |
| proxy | proxy | unreviewed | 6 strings; 5 say "procuration". |
| Resource Credits (RC) | crédits de ressources (RC) | unreviewed | |
| upvote / downvote | vote positif / vote négatif | unreviewed | |
| vote weight / downvote power | poids du vote / puissance de vote négatif | unreviewed | |
| follow / mute | suivre / masquer | unreviewed | Mute: 23 of 31 strings use "masquer". |
| reblog | rebloguer | unreviewed | |
| community | communauté | unreviewed | |
| community subscribers | abonnés | unreviewed | #1717 |
| post / comment / reply | article / commentaire / réponse | unreviewed | "article" in 58 of 114 strings; "publication" 23, "post" 20. |
| wallet | portefeuille | unreviewed | |
| log in / log out | Se connecter / Se déconnecter | unreviewed | |
| forget a saved key | oublier la clé enregistrée | unreviewed | "Oublier la clé enregistrée", "L'oublier et se déconnecter" (#1703). |
| password | mot de passe | unreviewed | |
| passkey | passkey | unreviewed | Kept as the product term. |
| biometric unlock | déverrouillage biométrique | unreviewed | As in `login_form.passkey_prompt.*`. |
| check before active-key operations | Demander avant chaque opération avec la clé active ; « Confirmez avec votre mot de passe ou votre passkey » | unreviewed | `active_check.*`, `password_form.active_check_*` (#1513). |
| market / interest | marché / intérêts | unreviewed | |
| this session (key badge) | Cette session | unreviewed | |
| recovery account | compte de récupération | unreviewed | |
| unmute | ne plus masquer | unreviewed | Button "Ne plus masquer" (#1698). |
| notification / notifications | notification / notifications | unreviewed | Same word as English: toast announcement label "Notification" (#1739). |
| Hive core (API set) | Cœur de Hive | unreviewed | API-set title (#1747); the API names in brackets (database, condenser, broadcast) stay English. |
| lite accounts | comptes lite | unreviewed | As in the lite-account strings; API-set title (#1747). |
| Balance API | API des soldes | unreviewed | API-set title (#1747). Bridge, Hivemind REST, HAfAH and HiveSense are API names, not translated. |
| For You feed | fil Pour vous | unreviewed | As in the For You feed strings; API-set title (#1747). |
| API node / API set panel | nœud (d'API) ; famille d'API | unreviewed | /healthchecker (#1725) : « Serveurs d'API par famille d'API », node states « éligible », « non pris en charge », « hors service », « inconnu », « dégradé » ; « Choix automatique », « Par défaut », « Utilisé ». |

## Register

Formal "vous": "Votre brouillon", "votre vote" (162 "votre", no "tu").

## Plural forms

Categories: `one`, `many`, `other`. `one` covers 0 and 1 (and fractions
below 2).

| Category | Numbers | Example |
|---|---|---|
| one | 0, 1, 1,5 | 0 votant / 1 votant |
| many | 1 000 000, 2 000 000, … | 1 000 000 de votants |
| other | 2–999 999 | 5 votants |

## Numbers, dates and times

- Decimal comma, narrow no-break space grouping: "1 234,5".
- Abbreviated amounts: the app's K/M suffix with the decimal comma, "651,7K".
- Dates: "15 mai 2026". Month names lower case.
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "il y a 5 heures", "hier".
- Percent and colon take a space before them: "12,5 %", "Niveau : 12 %".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER; passkey, blog, spoiler.

## Known drift

None known. #1727 settled the payout and rewards terms listed here before.
