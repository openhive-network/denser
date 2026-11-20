# Glossary: Russian (ru)

Applies to `apps/blog/locales/ru/common_blog.json`,
`apps/wallet/locales/ru/common_wallet.json` and
`packages/smart-signer/locales/ru/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Russian strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19. The
`agreed` rows were decided for #1727 after comparing hive.blog, the Hive
wallet, Ecency and PeakD; a native speaker may still refine them.

## Terms

| English | Russian | Status | Notes |
|---|---|---|---|
| Safe Storage | безопасное хранилище | unreviewed | Label "Безопасное хранилище". Every string since #1698. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Использовать Keychain". |
| witness / witnesses | свидетель / свидетели | agreed (#1727) | Everywhere, wallet and blog: "Проголосовать за свидетелей", "Топ свидетелей", "голос за свидетеля @{{witness}}". As Ecency. Never "делегат" (a Golos-era term that collides with delegation, "делегирование") or "валидатор". |
| voters | проголосовавшие | unreviewed | A counted list counts votes: "1 голос", "3 голоса", "5 голосов". |
| proposal / proposals | предложение / предложения | unreviewed | |
| Unfunded | Не профинансировано; phone "Не профин." | unreviewed | |
| Up to … left | Осталось до <amount/> | unreviewed | Needs review: the Polish tester rejected the same wording ("Pozostało do") as reading wrongly (#1663). |
| refund (proposal) | возврат | unreviewed | |
| delegation / delegate | делегирование / делегировать | unreviewed | "Делегирования", "Делегировать". |
| power up / power down | Увеличить Силу Голоса / Уменьшить Силу Голоса | unreviewed | |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | выплата / после выплаты | unreviewed | 22 of 23 strings. |
| rewards / claim rewards | вознаграждения / Получить вознаграждения | unreviewed | "вознаграждение" in 30 of 48 strings, "награда" in 15. |
| curation rewards | кураторские вознаграждения | unreviewed | |
| beneficiary | бенефициар | unreviewed | |
| posting / active / owner / memo key | ключ публикации / активный ключ / ключ владельца / ключ MEMO | unreviewed | |
| Keys & Permissions / Authorities | Ключи и разрешения / Полномочия | unreviewed | |
| memo | заметка | unreviewed | The transfer field. |
| transfer | перевод / перевести | unreviewed | |
| savings | сберегательный счёт | unreviewed | |
| price feed | ценовой фид | unreviewed | "Курс не опубликован". |
| proxy | прокси | unreviewed | |
| Resource Credits (RC) | ресурсные кредиты (RC) | unreviewed | |
| upvote / downvote | голос за / голос против | unreviewed | |
| vote weight / downvote power | вес голоса / сила голоса против | unreviewed | |
| follow / mute | подписаться / заглушить | unreviewed | Mute: 20 of 31 strings use "заглуш-", 6 "скрыть". |
| reblog | репост; button "Поделиться" | unreviewed | |
| community | сообщество | unreviewed | |
| community subscribers | подписчики; "1 подписчик", "3 подписчика", "5 подписчиков" | unreviewed | Plural keys `communities.subscribers_count_*` (#1717). |
| post / comment / reply | пост / комментарий / ответ | unreviewed | "пост" in 92 of 114 strings. |
| wallet | кошелёк | unreviewed | |
| log in / log out | Войти / Выйти | unreviewed | |
| forget a saved key | забыть сохранённый ключ | unreviewed | As the existing "он будет забыт": "Забыть и выйти" (#1703). |
| password | пароль | unreviewed | |
| passkey | ключ доступа | unreviewed | |
| biometric unlock | биометрическая разблокировка | unreviewed | As in `login_form.passkey_prompt.*`. |
| market / interest | биржа / проценты | unreviewed | |
| this session (key badge) | Эта сессия | unreviewed | |
| recovery account | аккаунт восстановления | unreviewed | |
| unmute | снять заглушение | unreviewed | Buttons "Заглушить" / "Снять заглушение" (#1698). |
| notification / notifications | уведомление / уведомления | unreviewed | Toast announcement label "Уведомление", region "Уведомления ({hotkey})" (#1739). |

## Register

Formal "вы". Lower case "вы", "ваш" is the more frequent form (104 "вы"
against 90 "Вы"); pick one per string and do not mix within a screen.

Write "ё" where it belongs ("ещё", "кошелёк"): most strings already do (34
"ещё" against 3 "еще").

## Plural forms

Categories: `one`, `few`, `many`, `other` (`other` is for fractions).

| Category | Numbers | Example |
|---|---|---|
| one | 1, 21, 31, … | 1 голос |
| few | 2–4, 22–24, … | 3 голоса |
| many | 0, 5–20, 25–30, … | 5 голосов |
| other | 1,5 | 1,5 голоса |

## Numbers, dates and times

- Decimal comma, no-break space grouping: "1 234,5".
- Abbreviated amounts: the app's K/M suffix with the decimal comma, "651,7K".
- Dates: "15 мая 2026 г." (`Intl.DateTimeFormat`).
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "5 часов назад", "вчера". Where
  CLDR's narrow form marks the past only with a minus sign, the app uses the
  short form: "47 мин. назад" (#1645).
- Percent: "12,5 %".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER, MEMO.

## Known drift

Strings that do not follow the glossary yet:

- "е" for "ё" in inflected forms (#1698 fixed the bare words "Кошелёк", "счёт", "ещё").
