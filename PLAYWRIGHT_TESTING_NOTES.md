# Playwright - Notatki z Testów

## ZASADY TESTOWANIA (WAŻNE!)

**Przed puszczeniem testów ZAWSZE:**

1. **Przeanalizuj strukturę projektu** - przeczytaj `DENSER_BLOG_ARCHITECTURE.md`
2. **Testy wykonuj na stronie produkcyjnej**: `https://blog.openhive.network`
3. **Do akcji na stronie używaj Playwright** - hover, click, nawigacja, odczyt tooltipów
4. **Do weryfikacji rezultatów używaj Hive API**: `https://api.hive.blog`
5. **Dokumentacja API**: `https://developers.hive.io/`

**WAŻNE: Testy BEZ LOGOWANIA!**
- Nie używaj żadnych kluczy prywatnych (posting, active, owner)
- Testuj tylko funkcjonalności dostępne dla niezalogowanych użytkowników
- Parametr `observer` w API służy tylko do personalizacji widoku (gray/hide), nie wymaga autoryzacji

**Lokalizacja skryptów testowych:**
- Tymczasowe skrypty `.mjs` umieszczaj w: `apps/blog/playwright/temp_ai_script_tests/`
- Po zakończeniu testów **USUŃ** skrypty z tego folderu
- Uruchamianie: `cd /storage1/denser/apps/blog && pnpm exec node playwright/temp_ai_script_tests/test.mjs`

---

## 1. Instalacja i uruchomienie

Playwright jest zainstalowany w projekcie. Skrypty uruchamiaj z katalogu `apps/blog/`:

```bash
cd /storage1/denser/apps/blog
pnpm exec node playwright/temp_ai_script_tests/test.mjs
```

---

## 2. Podstawowy szablon skryptu

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Nawigacja
await page.goto('https://blog.openhive.network/trending', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// ... interakcje ...

await browser.close();
```

---

## 3. Hover i tooltips

```javascript
// Hover na element
const element = page.locator('[data-testid="comment-votes"]').first();
await element.scrollIntoViewIfNeeded();
await element.hover();
await page.waitForTimeout(1500);

// Pobierz tooltip/popover content
const popovers = await page.locator('[data-state="open"]').all();
for (const pop of popovers) {
  const text = await pop.textContent();
  console.log(text);
}
```

---

## 4. Kluczowe data-testid selektory

| Selektor | Lokalizacja | Opis |
|----------|-------------|------|
| `post-total-votes` | Lista postów | Liczba głosów na karcie posta |
| `post-card-votes-tooltip` | Lista postów | Tooltip z liczbą głosów |
| `comment-votes` | Stopka posta | Głosy w pojedynczym poście |
| `upvote-button` | Post/komentarz | Przycisk głosowania w górę |
| `downvote-button` | Post/komentarz | Przycisk głosowania w dół |
| `comment-payout` | Post | Wypłata za post |
| `author-name-link` | Post/komentarz | Link do autora |
| `author-reputation` | Post/komentarz | Reputacja autora |
| `login-btn` | Navbar | Przycisk logowania |
| `signup-btn` | Navbar | Przycisk rejestracji |

---

## 5. Przykład: Tooltip głosów w poście

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://blog.openhive.network/@mynewlife/last-frame-krakow-photowalk-at-hivebeecon-unshared', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const votesElement = page.locator('[data-testid="comment-votes"]').first();
await votesElement.scrollIntoViewIfNeeded();
await votesElement.hover();
await page.waitForTimeout(2000);

const popovers = await page.locator('[data-state="open"]').all();
for (const pop of popovers) {
  console.log(await pop.textContent());
}

await browser.close();
```

**Wynik tooltipa głosów:**
```
331 votes
trafalgar: $8.65
appreciator: $5.72
theycallmedan: $4.22
curatorhulk: $3.62
adm: $3.50
...and 311 more
```

---

## 6. Hive API - alternatywa dla prostych zapytań

Dla prostych danych (bez interakcji UI) można użyć bezpośrednio Hive API:

```bash
# Trending posts
curl -s "https://api.hive.blog" -d '{"jsonrpc":"2.0","method":"bridge.get_ranked_posts","params":{"sort":"trending","tag":"","observer":"","limit":1},"id":1}' | jq '.result[0]'

# Głosy na post
curl -s "https://api.hive.blog" -d '{"jsonrpc":"2.0","method":"condenser_api.get_active_votes","params":["author","permlink"],"id":1}' | jq '.result'
```

---

## 7. Wskazówki

- **Zawsze czekaj na załadowanie strony**: użyj `waitUntil: 'networkidle'` i dodatkowy `waitForTimeout`
- **Scroll przed hover**: użyj `scrollIntoViewIfNeeded()` przed `hover()`
- **Tooltips Radix UI**: szukaj elementów z `[data-state="open"]`
- **Unikaj duplikatów tekstu**: Radix tworzy ukryte accessibility spans - celuj w konkretny element potomny np. `> p`

---

## 8. Przykład: Pełny test - trending post + weryfikacja głosów

### Scenariusz
1. Wejdź na /trending
2. Znajdź pierwszy post (autor + tytuł)
3. Wejdź do posta
4. Hover na liczbie głosów → odczytaj tooltip
5. Zweryfikuj top głosującego przez Hive API

### Skrypt

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Wejdź na trending
await page.goto('https://blog.openhive.network/trending', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// 2. Znajdź pierwszy post
const postLinks = await page.locator('a[href*="/@"]').all();
let author = null;
let postTitle = null;
let postUrl = null;

for (const link of postLinks) {
  const href = await link.getAttribute('href');
  const text = await link.textContent();

  // Autor - link do profilu (/@username bez dalszej ścieżki)
  if (!author && href && href.match(/^\/@[a-z0-9.-]+$/) && text && text.trim().length > 0) {
    author = text.trim();
  }

  // Post URL i tytuł - link z permlinkiem i tekstem > 20 znaków (tytuł)
  if (!postUrl && href && href.split('/').length >= 3 && text && text.trim().length > 20) {
    postUrl = href;
    postTitle = text.trim();
  }

  if (author && postUrl) break;
}

console.log('=== PIERWSZY POST NA TRENDING ===');
console.log('Autor:', author);
console.log('Tytuł:', postTitle);
console.log('URL:', postUrl);

// 3. Wejdź do posta
await page.goto('https://blog.openhive.network' + postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// 4. Hover na głosach w stopce posta
const votesElement = page.locator('[data-testid="comment-votes"]').first();
await votesElement.scrollIntoViewIfNeeded();
await votesElement.hover();
await page.waitForTimeout(2500);

// 5. Odczytaj tooltip
console.log('\n=== TOOLTIP GŁOSÓW ===');
const popovers = await page.locator('[data-state="open"]').all();
for (const pop of popovers) {
  const text = await pop.textContent();
  console.log(text);
}

// Dane do weryfikacji API
const urlParts = postUrl.split('/');
const permlink = urlParts[urlParts.length - 1];
console.log('\n=== DANE DO WERYFIKACJI API ===');
console.log('Author:', author);
console.log('Permlink:', permlink);

await browser.close();
```

### Weryfikacja przez API

```bash
# Pobierz top 5 głosów posortowanych po rshares (wartość głosu)
curl -s "https://api.hive.blog" -d '{"jsonrpc":"2.0","method":"condenser_api.get_active_votes","params":["mynewlife","last-frame-krakow-photowalk-at-hivebeecon-unshared"],"id":1}' | jq '[.result[] | {voter: .voter, rshares: .rshares, percent: .percent}] | sort_by(-.rshares) | .[0:5]'
```

### Wynik testu (2026-01-14)

**Post:**
- Autor: @mynewlife
- Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared

**Top głosujący z tooltipa:**
| Użytkownik | Wartość |
|------------|---------|
| trafalgar | $8.66 |
| appreciator | $5.73 |
| theycallmedan | $4.23 |
| curatorhulk | $3.63 |
| adm | $3.50 |

**Weryfikacja API (top 5 po rshares):**
| Użytkownik | rshares | percent |
|------------|---------|---------|
| trafalgar | 65,346,451,414,561 | 10000 (100%) |
| appreciator | 43,207,097,609,696 | 1100 (11%) |
| theycallmedan | 31,878,417,677,470 | 10000 (100%) |
| curatorhulk | 27,356,769,435,186 | 10000 (100%) |
| adm | 26,432,786,221,802 | 10000 (100%) |

**Wynik: PASS** - Kolejność głosujących z UI zgadza się z danymi z API.

---

## 9. Wnioski z testów

### Struktura linków na /trending
- Linki do autorów: `/@username` (regex: `/^\/@[a-z0-9.-]+$/`)
- Linki do postów: `/community/@author/permlink` lub `/@author/permlink`
- Tytuły postów mają > 20 znaków

### Czas ładowania
- `domcontentloaded` + 8s timeout działa lepiej niż `networkidle` dla strony trending
- Dla pojedynczego posta: 6s timeout wystarczy

### Tooltips
- Na stronie posta jest wiele elementów `[data-testid="comment-votes"]` (post + komentarze)
- Hover na `.first()` zwraca tooltip głównego posta
- Tooltip zawiera również komentarze (trzeba parsować tylko pierwszą linię dla listy głosów)
- **Struktura popoverów** (po hover na głosach):
  - Popover 0: Liczba głosów (np. "341 votes")
  - Popover 1: Lista głosujących (np. "trafalgar: $8.67appreciator: $5.73...")
  - Popover 2+: Komentarze
- Szukaj popover z listą przez `text.includes(': $')`

---

## 10. Hive API - Parametr Observer

### Co robi `observer`
- Określa perspektywę zalogowanego użytkownika
- Wpływa na pola `gray`, `hide`, `blacklists` w odpowiedzi
- Pokazuje czy post/autor jest zmutowany/zablokowany z perspektywy observera
- Bez observer = neutralna perspektywa (żaden użytkownik nie jest zmutowany)

### Użycie w Bridge API

```javascript
// bridge.get_post z observer
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: {
    author: 'mynewlife',
    permlink: 'last-frame-krakow-photowalk-at-hivebeecon-unshared',
    observer: 'trafalgar'  // perspektywa użytkownika
  },
  id: 1
};

// bridge.get_ranked_posts z observer
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_ranked_posts',
  params: {
    sort: 'trending',
    tag: '',
    observer: 'gtg',
    limit: 10
  },
  id: 1
};
```

### Curl przykłady

```bash
# Get post z observer
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_post",
  "params":{
    "author":"mynewlife",
    "permlink":"last-frame-krakow-photowalk-at-hivebeecon-unshared",
    "observer":"trafalgar"
  },
  "id":1
}' | jq '{title: .result.title, gray: .result.stats.gray, hide: .result.stats.hide}'

# Get ranked posts z observer
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_ranked_posts",
  "params":{"sort":"trending","tag":"","observer":"gtg","limit":3},
  "id":1
}' | jq '.result[] | {author, gray: .stats.gray, hide: .stats.hide}'
```

### Weryfikacja głosu przez API

```bash
# Pobierz top 5 głosów posortowanych po rshares
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_post",
  "params":{
    "author":"mynewlife",
    "permlink":"last-frame-krakow-photowalk-at-hivebeecon-unshared",
    "observer":"trafalgar"
  },
  "id":1
}' | jq '[.result.active_votes[] | {voter, rshares}] | sort_by(-.rshares) | .[0:5]'
```

---

## 11. Pełny test z Observer (2026-01-14)

### Scenariusz
1. Wejdź na /trending (Playwright)
2. Znajdź pierwszy post
3. Wejdź do posta, hover na głosach
4. Odczytaj top głosującego z tooltipa
5. Wywołaj Hive API z tym użytkownikiem jako observer
6. Zweryfikuj że observer faktycznie głosował

### Wynik testu

```
========================================
CZĘŚĆ 1: PLAYWRIGHT - DANE Z UI
========================================

PIERWSZY POST NA TRENDING:
  Autor: mynewlife
  Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared
  URL: /hivebeecon/@mynewlife/last-frame-krakow-photowalk-at-hivebeecon-unshared

TOOLTIP GŁOSÓW:
  Liczba głosów: 341
  Top 5 głosujących:
    1. trafalgar: $8.67
    2. appreciator: $5.73
    3. theycallmedan: $4.23
    4. curatorhulk: $3.63
    5. adm: $3.51

  TOP GŁOSUJĄCY: trafalgar

========================================
CZĘŚĆ 2: HIVE API Z OBSERVER
========================================

API Request:
  Method: bridge.get_post
  Author: mynewlife
  Permlink: last-frame-krakow-photowalk-at-hivebeecon-unshared
  Observer: trafalgar

API Response:
  Title: Last Frame - Krakow photowalk at hivebeecon - unshared
  Total votes: 341
  Payout: 37.89
  Stats (z perspektywy trafalgar):
    gray: false
    hide: false

  Top 5 głosujących (po rshares):
    1. trafalgar: 65346451414561 rshares
    2. appreciator: 43207097609696 rshares
    3. theycallmedan: 31878417677470 rshares
    4. curatorhulk: 27356769435186 rshares
    5. adm: 26432786221802 rshares

========================================
CZĘŚĆ 3: WERYFIKACJA
========================================

UI Top Voter: trafalgar
API Top Voter: trafalgar

✓ PASS: Top głosujący z UI zgadza się z API!

✓ WERYFIKACJA OBSERVER: trafalgar faktycznie oddał głos na ten post
  rshares: 65346451414561

=== PORÓWNANIE KOLEJNOŚCI TOP 5 ===
UI:   trafalgar, appreciator, theycallmedan, curatorhulk, adm
API:  trafalgar, appreciator, theycallmedan, curatorhulk, adm

✓ PASS: Kolejność głosujących jest identyczna!
```

### Wnioski
- Parametr `observer` w Bridge API pozwala na personalizację wyników
- UI tooltipa sortuje głosujących po wartości ($), co odpowiada sortowaniu po `rshares` w API
- Weryfikacja głosu przez API potwierdza dane z UI

---

## 12. Test: Weryfikacja liczby komentarzy (2026-01-14)

### Scenariusz
1. Wejdź na /trending (Playwright)
2. Pobierz liczbę komentarzy z post card pierwszego posta
3. Wejdź do posta i policz widoczne komentarze
4. Zweryfikuj obie wartości przez Hive API

### Kluczowe selektory

| Selektor | Lokalizacja | Opis |
|----------|-------------|------|
| `post-card-response-link` | Post card | Liczba komentarzy na karcie posta |
| `comment-list-item` | Strona posta | Pojedynczy komentarz |
| `comment-respons-header` | Strona posta | Nagłówek sekcji komentarzy |

### Skrypt

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Wejdź na trending
await page.goto('https://blog.openhive.network/trending', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// 2. Znajdź pierwszy post
const postLinks = await page.locator('a[href*="/@"]').all();
let author = null;
let postUrl = null;

for (const link of postLinks) {
  const href = await link.getAttribute('href');
  const text = await link.textContent();

  if (!author && href && href.match(/^\/@[a-z0-9.-]+$/) && text && text.trim().length > 0) {
    author = text.trim();
  }

  if (!postUrl && href && href.split('/').length >= 3 && text && text.trim().length > 20) {
    postUrl = href;
  }

  if (author && postUrl) break;
}

// 3. Pobierz liczbę komentarzy z post card
const postCardComments = page.locator('[data-testid="post-card-response-link"]').first();
const commentsOnCard = await postCardComments.textContent();
console.log('Komentarze na post card:', commentsOnCard);

// 4. Wejdź do posta
await page.goto('https://blog.openhive.network' + postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// 5. Policz komentarze w poście
const commentItems = await page.locator('[data-testid="comment-list-item"]').all();
console.log('Komentarze w poście:', commentItems.length);

await browser.close();

// 6. Weryfikacja przez API
const urlParts = postUrl.split('/');
const permlink = urlParts[urlParts.length - 1];
const authorClean = author.replace('@', '');

const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: { author: authorClean, permlink: permlink, observer: '' },
  id: 1
};

const response = await fetch('https://api.hive.blog', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiRequest)
});

const data = await response.json();
console.log('API children:', data.result.children);
```

### Weryfikacja przez API

```bash
# Liczba komentarzy (pole children)
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_post",
  "params":{"author":"mynewlife","permlink":"last-frame-krakow-photowalk-at-hivebeecon-unshared","observer":""},
  "id":1
}' | jq '.result.children'

# Pełna struktura dyskusji (wszystkie komentarze)
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_discussion",
  "params":{"author":"mynewlife","permlink":"last-frame-krakow-photowalk-at-hivebeecon-unshared"},
  "id":1
}' | jq 'keys | length - 1'  # -1 bo główny post też jest w wynikach
```

### Wynik testu

```
========================================
TEST: Weryfikacja liczby komentarzy
========================================

CZĘŚĆ 1: LICZBA KOMENTARZY NA POST CARD

Pierwszy post:
  Autor: mynewlife
  Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared

=== KOMENTARZE NA POST CARD ===
Liczba komentarzy (post card): 5

========================================
CZĘŚĆ 2: KOMENTARZE WEWNĄTRZ POSTA
========================================

=== KOMENTARZE W POŚCIE ===
Liczba elementów comment-list-item: 5
Nagłówek sekcji komentarzy: |Reply|5

========================================
CZĘŚĆ 3: HIVE API - WERYFIKACJA
========================================

=== DANE Z API ===
Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared
children (liczba komentarzy): 5
Liczba wpisów w discussion: 6
Liczba komentarzy (discussion - 1): 5

========================================
CZĘŚĆ 4: PORÓWNANIE WYNIKÓW
========================================

| Źródło                  | Wartość |
|-------------------------|---------|
| Post Card (UI)          | 5       |
| Komentarze w poście     | 5       |
| API children            | 5       |
| API discussion count    | 5       |

=== WERYFIKACJA ===
✓ PASS: Post Card zgadza się z API (children)
✓ PASS: Widoczne komentarze zgadzają się z API
```

### Wnioski
- Pole `children` w API odpowiada liczbie komentarzy wyświetlanej w UI
- `bridge.get_discussion` zwraca wszystkie komentarze + główny post (stąd `length - 1`)
- Post card i strona posta pokazują tę samą liczbę komentarzy
- Jeśli jest więcej komentarzy niż widocznych, UI może mieć przycisk "load more"

---

## 13. Test: Weryfikacja wartości posta - payout (2026-01-14)

### Scenariusz
1. Wejdź na /trending (Playwright)
2. Pobierz wartość payout z post card pierwszego posta
3. Sprawdź czy wartość > 0
4. Wejdź do posta i pobierz wartość ze stopki
5. Sprawdź czy wartość > 0
6. Porównaj obie wartości z API

### Kluczowe selektory

| Selektor | Lokalizacja | Opis |
|----------|-------------|------|
| `post-payout` | Post card | Wartość payout na karcie posta |
| `comment-payout` | Stopka posta | Wartość payout w stopce posta |
| `payout-post-card-tooltip` | Post card | Tooltip z detalami payout |

### Skrypt

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1. Wejdź na trending
await page.goto('https://blog.openhive.network/trending', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// 2. Znajdź pierwszy post
const postLinks = await page.locator('a[href*="/@"]').all();
let author = null;
let postUrl = null;

for (const link of postLinks) {
  const href = await link.getAttribute('href');
  const text = await link.textContent();

  if (!author && href && href.match(/^\/@[a-z0-9.-]+$/) && text && text.trim().length > 0) {
    author = text.trim();
  }

  if (!postUrl && href && href.split('/').length >= 3 && text && text.trim().length > 20) {
    postUrl = href;
  }

  if (author && postUrl) break;
}

// 3. Pobierz wartość payout z post card
const postCardPayout = page.locator('[data-testid="post-payout"]').first();
const payoutOnCard = await postCardPayout.textContent();
const cardPayoutValue = parseFloat(payoutOnCard.replace('$', '').trim()) || 0;
console.log('Payout na post card:', payoutOnCard, '| Wartość:', cardPayoutValue);

// 4. Wejdź do posta
await page.goto('https://blog.openhive.network' + postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// 5. Pobierz wartość payout ze stopki posta
const footerPayout = page.locator('[data-testid="comment-payout"]').first();
const payoutInPost = await footerPayout.textContent();
const postPayoutValue = parseFloat(payoutInPost.replace('$', '').trim()) || 0;
console.log('Payout w stopce:', payoutInPost, '| Wartość:', postPayoutValue);

await browser.close();

// 6. Weryfikacja przez API
const urlParts = postUrl.split('/');
const permlink = urlParts[urlParts.length - 1];
const authorClean = author.replace('@', '');

const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: { author: authorClean, permlink: permlink, observer: '' },
  id: 1
};

const response = await fetch('https://api.hive.blog', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiRequest)
});

const data = await response.json();
const post = data.result;

// Oblicz payout z API
const pendingPayout = parseFloat(post.pending_payout_value?.replace(' HBD', '') || '0');
const curatorPayout = parseFloat(post.curator_payout_value?.replace(' HBD', '') || '0');
const authorPayout = parseFloat(post.author_payout_value?.replace(' HBD', '') || '0');
const apiPayoutValue = pendingPayout > 0 ? pendingPayout : (curatorPayout + authorPayout);

console.log('API payout:', apiPayoutValue.toFixed(2));
```

### Weryfikacja przez API

```bash
# Pobierz wartości payout
curl -s "https://api.hive.blog" -d '{
  "jsonrpc":"2.0",
  "method":"bridge.get_post",
  "params":{"author":"mynewlife","permlink":"last-frame-krakow-photowalk-at-hivebeecon-unshared","observer":""},
  "id":1
}' | jq '{
  pending_payout_value: .result.pending_payout_value,
  curator_payout_value: .result.curator_payout_value,
  author_payout_value: .result.author_payout_value,
  is_paidout: .result.is_paidout
}'
```

### Pola payout w API

| Pole | Opis |
|------|------|
| `pending_payout_value` | Oczekująca wypłata (przed payout) |
| `curator_payout_value` | Wypłata dla kuratorów (po payout) |
| `author_payout_value` | Wypłata dla autora (po payout) |
| `is_paidout` | Czy post został już wypłacony |

**Logika obliczania payout:**
- Przed wypłatą: `pending_payout_value`
- Po wypłacie: `curator_payout_value + author_payout_value`

### Wynik testu

```
========================================
TEST: Weryfikacja wartości posta (payout)
========================================

CZĘŚĆ 1: WARTOŚĆ NA POST CARD

Pierwszy post:
  Autor: mynewlife
  Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared

=== WARTOŚĆ NA POST CARD ===
Payout (post card): $46.45
✓ Wartość na post card > 0

========================================
CZĘŚĆ 2: WARTOŚĆ W STOPCE POSTA
========================================

=== WARTOŚĆ W STOPCE POSTA ===
Payout (stopka): $46.45
✓ Wartość w stopce posta > 0

========================================
CZĘŚĆ 3: HIVE API - WERYFIKACJA
========================================

=== DANE Z API ===
Tytuł: Last Frame - Krakow photowalk at hivebeecon - unshared
payout (pending_payout_value): 46.449 HBD
curator_payout_value: 0.000 HBD
author_payout_value: 0.000 HBD

Obliczony payout z API: 46.45

========================================
CZĘŚĆ 4: PORÓWNANIE WYNIKÓW
========================================

| Źródło                  | Wartość    |
|-------------------------|------------|
| Post Card (UI)          | $46.45    |
| Stopka posta (UI)       | $46.45    |
| API payout              | $46.45    |

=== WERYFIKACJA ===
✓ PASS: Wszystkie wartości > 0
✓ PASS: Post card zgadza się z API
✓ PASS: Stopka posta zgadza się z API
✓ PASS: Post card zgadza się ze stopką posta
```

### Wnioski
- UI wyświetla wartość z `pending_payout_value` (zaokrągloną do 2 miejsc po przecinku)
- Post card i stopka posta pokazują identyczną wartość
- Wartość w HBD jest konwertowana na $ (w tym przypadku 1:1)
- Tolerancja porównania: 0.02 (na zaokrąglenia)
