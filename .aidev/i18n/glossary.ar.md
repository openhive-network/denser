# Glossary: Arabic (ar)

Applies to `apps/blog/locales/ar/common_blog.json` only: the wallet and the
smart-signer do not ship Arabic. Status values and how to use this file:
`.aidev/i18n/README.md`.

No native speaker has reviewed the Arabic strings yet, so every term is
`unreviewed`: the rendering the locale file uses most as of 2026-11-19.
Wallet-only terms (refund, savings, price feed, proxy, authorities) have no
Arabic string yet; add them here when the first one is written.

## Terms

| English | Arabic | Status | Notes |
|---|---|---|---|
| Safe Storage | التخزين الآمن | unreviewed | 14 of 14 strings. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "استخدام Keychain". |
| witness / witnesses | الشهود | unreviewed | Navigation link only. |
| voters | المصوتون | unreviewed | |
| proposal / proposals | الاقتراحات | unreviewed | Navigation link only. |
| delegation | تفويض | unreviewed | "جارٍ تفويض أرصدة الموارد". |
| power up | زيادة الطاقة | unreviewed | "زيادة الطاقة بنسبة 100%". |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols, written left to right inside the sentence: "Hive Power بنسبة 100%". |
| payout / after payout | الدفع / بعد الدفع | unreviewed | 14 of 20 strings: "+{{count}} صوت بعد الدفع (غير محتسب)", "رفض الدفعة". |
| rewards | المكافآت | unreviewed | |
| curation rewards | مكافآت التنسيق | unreviewed | |
| beneficiary | المستفيد | unreviewed | |
| posting / active key | مفتاح النشر / المفتاح النشط | unreviewed | |
| Resource Credits (RC) | رصيد الموارد (RC) | unreviewed | |
| upvote / downvote | التصويت الإيجابي / التصويت السلبي | unreviewed | |
| follow / mute | متابعة / كتم | unreviewed | Muted: مكتوم, المكتومة; unmute إلغاء الكتم (#1698). |
| reblog | إعادة النشر | unreviewed | |
| community | المجتمع | unreviewed | 31 of 35 strings. |
| community subscribers | المشتركون; "{{value}} مشترك" | unreviewed | Plural keys `communities.subscribers_count_*` (#1717). |
| post / comment / reply | مشاركة / تعليق / رد | unreviewed | مشاركة in 66 of 110 strings, منشور in 30. |
| wallet | المحفظة | unreviewed | |
| log in / log out | تسجيل الدخول / تسجيل الخروج | unreviewed | |
| password | كلمة المرور | unreviewed | |
| passkey | مفتاح المرور | unreviewed | |
| notification / notifications | إشعار / الإشعارات | unreviewed | Toast announcement label "إشعار", region "الإشعارات ({hotkey})" (#1739). |
| Hive core (API set) | نواة Hive | unreviewed | API-set title (#1747); the API names in brackets (database, condenser, broadcast) stay English. |
| lite accounts | الحسابات الخفيفة | unreviewed | As in the lite-account strings; API-set title (#1747). |
| Balance API | واجهة الأرصدة البرمجية | unreviewed | API-set title (#1747). Bridge, Hivemind REST, HAfAH and HiveSense are API names, not translated. |
| For You feed | موجز «لك» | unreviewed | As in the For You feed strings; API-set title (#1747). |

## Register

Second person masculine singular, as most strings write it (suffix ـك: 445
uses against 5 of ـكم). Modern Standard Arabic.

## Plural forms

Categories: `zero`, `one`, `two`, `few`, `many`, `other`; every counted key
carries all six.

| Category | Numbers | Example |
|---|---|---|
| zero | 0 | 0 ساعة |
| one | 1 | 1 ساعة |
| two | 2 | 2 ساعتان |
| few | 3–10, 103–110, … | 5 ساعات |
| many | 11–99, 111–199, … | 11 ساعة |
| other | 100–102, fractions | 100 ساعة |

## Numbers, dates and times

- The page is right to left; numbers, @accounts, URLs and token symbols stay
  left to right inside it.
- Digits: Western (0–9), as `Intl.NumberFormat('ar')` gives in the app's
  runtime: "1,234.5". Do not hard-code Arabic-Indic digits in a string.
- Abbreviated amounts: the app's K/M suffix, "651.7K".
- Dates: "15 مايو 2026".
- Times: 12-hour with ص/م, "2:05 م".
- Relative times (`Intl.RelativeTimeFormat`): "قبل 5 ساعات", "أمس".
- Percent: "12.5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, API; HIVE, HBD, HP, HIVE POWER, Hive Power.

## Known drift

None known. The #1698 review fixed the drift listed here before.
