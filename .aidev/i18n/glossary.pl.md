# Glossary: Polish (pl)

Applies to `apps/blog/locales/pl/common_blog.json`,
`apps/wallet/locales/pl/common_wallet.json` and
`packages/smart-signer/locales/pl/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

Seeded from the tester's corrections (#1188, #1286, #1463, #1540, #1603, #1609,
#1662, #1663, #1673, #1684) and the strings pl already uses consistently.

## Terms

| English | Polish | Status | Notes |
|---|---|---|---|
| Safe Storage | bezpieczny magazyn | agreed (#1286) | Declines: „w bezpiecznym magazynie”, „do bezpiecznego magazynu”, „Użyj bezpiecznego magazynu”. Never „bezpieczne przechowywanie”. Label form: „Bezpieczny magazyn”. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | agreed (#1286) | Product name, not translated: „Użyj Keychain”. |
| witness / witnesses | świadek / świadkowie | agreed (#1188) | Everywhere, wallet and blog: „Głosuj na świadków”, „Głosowanie na świadków”, „stronie świadków”. Never „delegat”, which collides with delegation. |
| voters | głosujący | agreed (#1663, #1673) | „Głosujący”, „Szukaj głosujących”. A counted voter list counts votes: „1 głos”, „3 głosy”, „5 głosów”. |
| votes remaining | Pozostał ci 1 głos / Pozostały ci 3 głosy / Pozostało ci 5 głosów | agreed (#1673) | Plural keys `votes_remaining_{one,few,many,other}`; zero is its own key: „Nie masz już więcej głosów.” |
| remove a witness vote | wycofać głos na świadka | agreed (#1662, #1673) | Title „Wycofaj głos na świadka @{{witness}}”, question „Wycofać swój głos na @{{witness}}?”. |
| proposal / proposals | propozycja / propozycje | agreed (#1188) | Feminine: status „rozpoczęta”, „zakończona”, „nierozpoczęta”; „Propozycje Hive”. |
| Unfunded | Niesfinansowane; phone „Niesfin.” | agreed (#1663) | „(nigdy nie finansowana)”, phone „(nigdy)”. |
| Up to … left | Jeszcze maks. … | agreed (#1663) | „Jeszcze maks. <amount/>”. Never „Pozostało do”. |
| refund (proposal) | zwrot | agreed (#1663) | Never „zrefundowane”. |
| delegation / delegate | delegacja / delegować | agreed (#1188) | „Delegacje”, „Deleguj”, „Deleguj RC”, „Przychodzące delegacje”, „Potwierdź wycofanie delegacji HIVE POWER”. Revoke a delegation: „Wycofaj”. |
| power up | zwiększyć moc; button „Zwiększ moc” | agreed (#1188) | Running text may add the English term once: „zwiększania mocy (Power up)”. |
| power down | zmniejszyć moc; button „Zmniejsz moc” | agreed (#1188) | „Anuluj zmniejszanie mocy”, „Następne zmniejszenie mocy nastąpi za”. |
| HIVE, HBD, HIVE POWER, HP | unchanged | agreed (#1188) | Token symbols. Do not repeat the symbol after an amount that already carries it. |
| after payout | po wypłacie | unreviewed | „+1 głos po wypłacie (niewliczony)”. |
| payout | wypłata | unreviewed | Most frequent (14 of 23 strings): „Odrzuć wypłatę”, „Maksymalna akceptowana wypłata”. Tabs and titles: „Wypłaty” (#1698). |
| rewards / claim rewards | nagrody / Odbierz nagrody | agreed (#1609) | Button „Odbierz” (never „Obierz”); toast „Nagrody zostały odebrane.” |
| curation rewards | nagrody kuratorskie | agreed (#1188) | „Nagroda kuratorska za:”. |
| author rewards / benefactor rewards | nagrody autorskie / nagrody beneficjenta | agreed (#1188) | Wallet tabs and titles too: „Nagrody autorskie”, „Nagrody kuratorskie” (#1698). |
| beneficiary | beneficjent | unreviewed | „beneficjenci” in the post editor's advanced options. |
| posting key | klucz Posting; on the keys page „Klucz publikowania (Posting)” | agreed (#1188, #1603) | Key names stay English in prompts (#1603): „Wprowadź klucz Active”. Mid-sentence use `{{keyType, capitalize}}` (#1609): „klucz Active”. |
| active key | klucz Active; keys page „Klucz aktywny (Active)” | agreed (#1188, #1603) | As above. |
| owner key | klucz Owner; keys page „Klucz właściciela (Owner)” | agreed (#1188) | |
| memo key | klucz Memo; keys page „Klucz notatek (Memo)” | agreed (#1188) | |
| Keys & Permissions | Klucze i uprawnienia | agreed (#1188) | Never „permisje”. |
| Authorities | Upoważnienia | agreed (#1188) | „Upoważnienie właściciela (Owner)”, „Zaktualizuj upoważnienia”. Keeps it apart from „uprawnienia”. |
| memo | notatka | agreed (#1188) | „Zaszyfrowana notatka musi zawierać tekst po #.” |
| transfer | przelew | agreed (#1188) | „Przelew do oszczędności”. Never „Transfer”. |
| savings | oszczędności | agreed (#1188) | „Oczekujące wypłaty z oszczędności”. |
| request ID | ID zlecenia | agreed (#1463) | Never „ID żądania”. |
| order (market) | zlecenie | agreed (#1188) | „Złożyć zlecenie na giełdzie”, „Oferty kupna”. |
| market | giełda | unreviewed | |
| interest | odsetki | agreed (#1188) | „Oprocentowanie HBD: … w skali roku”. |
| price feed | kurs ceny | agreed (#1188) | „Brak opublikowanego kursu” (#1662). |
| proxy (witness voting) | pełnomocnik | agreed (#1188) | „Ustaw pełnomocnika”. |
| Resource Credits (RC) | Punkty zasobów (RC) | agreed (#1188) | Unit for billions: „mld”. „Poziom punktów zasobów (RC): 42%” (#1698). |
| API node | węzeł API | agreed (#1188) | |
| upvote / downvote | głos za / głos przeciw | unreviewed | |
| vote weight / downvote power | waga głosu / siła głosu przeciw | unreviewed | |
| follow | obserwować; button „Obserwuj” | unreviewed | The delegate dialog's suggestion suffix „obserwujesz” is agreed (#1188). |
| mute / unmute | wyciszyć / wyłączyć wyciszenie | unreviewed | Buttons „Wycisz”, „Wyłącz wyciszenie” (#1698). |
| reblog | reblog, „Rebloguj” | unreviewed | |
| community | społeczność | unreviewed | |
| community subscribers | subskrybenci; „1 subskrybent”, „3 subskrybenci”, „5 subskrybentów” | unreviewed | Plural keys `communities.subscribers_count_*` (#1717). |
| post / comment / reply | post / komentarz / odpowiedź | unreviewed | „post” in 85 of 114 strings. |
| wallet | portfel | unreviewed | |
| log out | Wyloguj | agreed (#1188) | Never „Wylogowuj”. |
| forget a saved key | zapomnieć zapisany klucz | unreviewed | „Zapomnij zapisany klucz”, „Zapomnij go i wyloguj” (#1703). |
| log in | Zaloguj się | unreviewed | |
| password / master password | hasło / hasło główne | agreed (#1188) | |
| passkey | klucz dostępu | unreviewed | |
| notifications | powiadomienia | unreviewed | „@{{username}} odpowiedział na Twój post” (#1609). |
| this session (key badge) | Ta sesja | unreviewed | |
| recovery account | konto odzyskiwania | unreviewed | |
| Power up 100% (payout option) | Zwiększ moc 100% | unreviewed | Blog payout options and settings, with the agreed power-up term (#1698). Never „Wzmocnij”, „Zasilanie”. |
| pending payout | oczekująca wypłata | unreviewed | „Oczekująca wypłata: $1,23”, „Brak oczekujących wypłat.” (#1698). |
| proxied (vote weight) | od pełnomocnictw | unreviewed | „5 HP własne + 3 HP od pełnomocnictw”, „głosuje przez pełnomocnika @gtg” (#1698). The voters dialog's weight column keeps the short „+3 HP z proxy”: the long form does not fit its three columns at 1280 px (WALLET-WITNESS-VOTERS-06); its title gives the full wording. |
| block explorer | eksplorator bloków | unreviewed | „Otwórz w eksploratorach bloków” (#1698). |
| authority of a key (posting authority) | upoważnienie | unreviewed | „upoważnienie Posting konta”, „nie ma upoważnienia Active” (#1698), as Authorities. Never „uprawnienia Posting”. |

## Register

Informal second person singular, as the tester's corrections write it:
„Możesz…”, „Twoje tokeny”, „Pozostał ci 1 głos”. Possessive pronouns are
capitalised in sentences (Twój, Twoje, Twojego: 64 of 69 uses).

Gender-neutral wording wherever the user is the subject (#1188): impersonal
or passive forms, „Otrzymano”, „Odebrano nagrody”, „Ustawiono pełnomocnika”,
„Moje wygenerowane hasło jest bezpiecznie zapisane”, „nie oddano jeszcze
głosów”. Not „Ustawiłeś”, „Zachowałem”.

Sentence case for headings, labels and buttons (#1540): „Zmiana hasła”,
„Odrzuć wypłatę”, not English title case. Buttons start with a capital
letter.

## Plural forms

Categories: `one`, `few`, `many`, `other` (`other` is for fractions).

| Category | Numbers | Example (#1673, #1663) |
|---|---|---|
| one | 1 | Pozostał ci 1 głos. / 1 godzina |
| few | 2–4, 22–24, … | Pozostały ci 3 głosy. / 3 godziny |
| many | 0, 5–21, 25–31, … | Pozostało ci 5 głosów. / 12 godzin |
| other | 1,5 | Pozostało ci 1,5 głosu. / 1,5 godziny |

Never glue a fixed suffix to a count („2 lat temu”) and never use the
`lat_a` / `tygodni_e` placeholders (#1188, #1662): use plural keys, or `Intl`
for relative times.

## Numbers, dates and times

- Decimal comma, non-breaking space as the thousands separator, and no
  separator below 10 000: „1234,5”, „12 000,000 HBD” (#1684).
- Abbreviated amounts: „651,7K”, „1,23M”, „+999,99K” (#1684); RC billions
  „mld”.
- Dates: day, month name in the genitive, year: „15 maja 2026”, short
  „15 maj 2026” (`Intl.DateTimeFormat`, #1188). Never English order. Month
  names lower case.
- Times: 24-hour, „14:05”.
- Relative times from `Intl.RelativeTimeFormat`: „5 godzin temu”, „2 lata
  temu”, „wczoraj”. The narrow hour is „godz.”, never „g.” (#1662):
  „5 godz. temu”, „12 godz.”. Short days „22 d.”, months „1 mies. temu”
  (#1663, #1673).
- Percent: „12,5%”.

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive
(„portfel Google Drive”), Hive Bridge, Ecency, PeakD, Hive.blog,
Blocktrades, Ionomy, OpenHive; FAQ, NSFW, RC, DHF, CSV, API; token symbols
HIVE, HBD, HP, HIVE POWER, Hive Power; key names Posting, Active, Owner, Memo
(#1603).

## Known drift

Strings that do not follow the glossary yet:

- „Hbauth” in the blog's and the wallet's `login_form.*hbauth*` keys (the smart-signer copies, which the dialogs show, say „bezpieczny magazyn”).
