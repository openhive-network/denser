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

---

## 14. Smoke Testy - Wzorce i Best Practices (2026-01-15)

### Struktura smoke testu

Każdy smoke test powinien mieć następującą strukturę:

```javascript
/**
 * SMOKE-XX: Nazwa testu
 *
 * Cel: Krótki opis celu testu
 *
 * Kroki:
 * 1. Krok pierwszy
 * 2. Krok drugi
 * ...
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-XX: Nazwa testu');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // CZĘŚĆ 1: Akcje UI (Playwright)
    // CZĘŚĆ 2: Weryfikacja z API
    // CZĘŚĆ 3: Porównanie wyników
    // PODSUMOWANIE

    return allPassed;
  } catch (error) {
    console.error('\n✗ BŁĄD:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Uruchom test
runTest()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(error => {
    console.error('Nieoczekiwany błąd:', error);
    process.exit(1);
  });
```

### Kluczowe selektory dla smoke testów

#### Strona główna (Post Card)
| Selektor | Opis |
|----------|------|
| `post-list-item` | Pojedyncza karta posta |
| `post-author` | Nazwa autora (@username) |
| `post-title` | Tytuł posta (zawiera link `a`) |
| `post-payout` | Wartość payout ($XX.XX) |
| `post-total-votes` | Liczba głosów |
| `post-card-response-link` | Liczba komentarzy |

#### Strona posta
| Selektor | Opis |
|----------|------|
| `article-title` | Tytuł artykułu |
| `#articleBody` | Treść artykułu (użyj `.first()` - wiele elementów!) |
| `comment-votes` | Głosy w stopce (użyj `.first()`) |
| `comment-payout` | Payout w stopce (użyj `.first()`) |
| `upvote-button` | Przycisk upvote |
| `downvote-button` | Przycisk downvote |
| `comment-reply` | Przycisk reply |
| `comment-list-item` | Pojedynczy komentarz |
| `author-name-link` | Link do autora w poście |

#### Profil użytkownika
| Selektor | Opis |
|----------|------|
| `profile-name` | Nazwa wyświetlana (np. "Gandalf the Grey (75)") |
| `profile-about` | Opis profilu |
| `user-joined` | Data dołączenia |
| `profile-stats` | Kontener statystyk |
| `profile-stats li:nth(0)` | Followers |
| `profile-stats li:nth(1)` | Posts |
| `profile-stats li:nth(2)` | Following |
| `profile-stats li:nth(3)` | HP |
| `profile-follow-button` | Przycisk Follow |

#### Social Media Share
| Selektor | Opis |
|----------|------|
| `share-on-facebook` | Udostępnij na Facebook |
| `share-on-twitter` | Udostępnij na Twitter |
| `share-on-linkedin` | Udostępnij na LinkedIn |
| `share-on-reddit` | Udostępnij na Reddit |

### Wzorce pobierania danych

#### Pobieranie pierwszego posta z /trending

```javascript
const firstPost = page.locator('[data-testid="post-list-item"]').first();

// Autor
const authorElement = firstPost.locator('[data-testid="post-author"]');
const authorText = await authorElement.textContent();
const author = authorText?.trim().replace('@', '') || '';

// Tytuł i link
const titleElement = firstPost.locator('[data-testid="post-title"] a');
const title = await titleElement.textContent();
const postLink = await titleElement.getAttribute('href');

// Permlink z URL
const urlParts = postLink?.split('/') || [];
const permlink = urlParts[urlParts.length - 1] || '';
```

#### Pobieranie statystyk profilu

```javascript
const profileStats = page.locator('[data-testid="profile-stats"]');
await profileStats.waitFor({ state: 'visible', timeout: 10000 });

// Followers - li.nth(0), Posts - li.nth(1), Following - li.nth(2), HP - li.nth(3)
const followersElement = profileStats.locator('li').nth(0);
const followersText = await followersElement.textContent() || '0';
const followersUI = parseInt(followersText.replace(/[^\d]/g, '')) || 0;
```

### Wzorce API

#### bridge.get_ranked_posts (trending)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_ranked_posts',
  params: { sort: 'trending', tag: '', observer: '', limit: 1 },
  id: 1
};
const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiRequest)
});
const data = await response.json();
const post = data.result[0];
```

#### bridge.get_post (szczegóły posta)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: { author: 'username', permlink: 'post-slug', observer: '' },
  id: 1
};
// Dostępne pola: title, children, pending_payout_value, active_votes, is_paidout
```

#### condenser_api.get_accounts (dane konta)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_accounts',
  params: [['username']],
  id: 1
};
// Dostępne pola: name, post_count, posting_json_metadata (zawiera profile.name, profile.about)
```

#### condenser_api.get_follow_count (followers/following)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_follow_count',
  params: ['username'],
  id: 1
};
// Dostępne pola: follower_count, following_count
```

### Ważne uwagi i pułapki

#### 1. Elementy z wieloma wystąpieniami
```javascript
// ŹLE - błąd "strict mode violation"
const articleBody = page.locator('#articleBody');

// DOBRZE - użyj .first()
const articleBody = page.locator('#articleBody').first();
```

#### 2. API ograniczenia
- `active_votes` w `bridge.get_post` jest **ograniczone do 1000 wpisów**
- Jeśli post ma więcej głosów, UI pokaże więcej niż API

#### 3. Tolerancje porównań
| Typ danych | Tolerancja | Powód |
|------------|------------|-------|
| Payout | ±$0.10 | Zaokrąglenia, opóźnienie cache |
| Followers/Following | ±50 | Cache może być nieaktualny |
| Posts count | ±10 | Cache może być nieaktualny |
| Vote count | ±10 lub API limit | API ogranicza do 1000 |

#### 4. Czas ładowania stron
```javascript
// Strona główna - dłuższy timeout
await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// Strona posta - krótszy timeout
await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// Profil - średni timeout
await page.goto(`${BASE_URL}/@username`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
```

#### 5. Parsowanie wartości z UI
```javascript
// Payout: "$61.28" -> 61.28
const payoutValue = parseFloat(payoutText.replace('$', '').trim()) || 0;

// Liczba z separatorami: "10,925 followers" -> 10925
const followers = parseInt(text.replace(/[^\d]/g, '')) || 0;

// Autor: "@username" -> "username"
const author = authorText?.trim().replace('@', '') || '';
```

### Lista wszystkich smoke testów (P0-P4)

#### Priorytet P0 (Krytyczne)
| ID | Nazwa | Opis | Plik |
|----|-------|------|------|
| SMOKE-01 | Strona główna | Ładowanie postów, weryfikacja z API | `smoke-01-homepage-posts.mjs` |
| SMOKE-04 | Nawigacja do posta | Kliknięcie → tytuł, treść, stopka | `smoke-04-navigate-to-post.mjs` |
| SMOKE-08 | Profil użytkownika | Statystyki vs API accounts/follow_count | `smoke-08-profile-basic-info.mjs` |

#### Priorytet P1 (Ważne)
| ID | Nazwa | Opis | Plik |
|----|-------|------|------|
| SMOKE-05 | Głosy z API | Tooltip głosów vs API active_votes | `smoke-05-post-votes-api.mjs` |
| SMOKE-06 | Komentarze | Post card vs strona vs API children | `smoke-06-comments-count.mjs` |
| SMOKE-07 | Payout | Post card vs stopka vs API payout | `smoke-07-payout-value.mjs` |

#### Priorytet P2 (Tooltips)
| ID | Nazwa | Opis | Plik |
|----|-------|------|------|
| SMOKE-02 | Tooltip głosów (post card) | Hover na głosach → tooltip | `smoke-02-postcard-votes-tooltip.mjs` |
| SMOKE-03 | Tooltip payout (post card) | Hover na payout → breakdown | `smoke-03-postcard-payout-tooltip.mjs` |
| SMOKE-09 | Followers/Following | Szczegółowe statystyki profilu vs API | `smoke-09-profile-followers-api.mjs` |

#### Priorytet P3 (Nawigacja)
| ID | Nazwa | Opis | Plik |
|----|-------|------|------|
| SMOKE-10 | Nawigacja przez tagi | Kliknięcie tag → filtrowanie postów | `smoke-10-tag-navigation.mjs` |
| SMOKE-11 | Kategorie | /trending vs /hot vs /created | `smoke-11-category-navigation.mjs` |
| SMOKE-12 | Communities | Lista communities, nawigacja | `smoke-12-communities-list.mjs` |

#### Priorytet P4 (Dodatkowe)
| ID | Nazwa | Opis | Plik |
|----|-------|------|------|
| SMOKE-13 | Strony statyczne | FAQ, Privacy, ToS, Welcome | `smoke-13-static-pages.mjs` |
| SMOKE-14 | Theme toggle | Przełączanie dark/light mode | `smoke-14-theme-toggle.mjs` |
| SMOKE-15 | Login modal | Otwieranie modalu logowania | `smoke-15-login-modal.mjs` |

---

## 15. Uruchamianie Smoke Testów

### Wymagania
- Node.js 20+
- pnpm
- Playwright zainstalowany w projekcie

### Uruchamianie pojedynczego testu

```bash
cd /storage1/denser/apps/blog
pnpm exec node playwright/temp_ai_script_tests/smoke-01-homepage-posts.mjs
```

### Uruchamianie wszystkich smoke testów

```bash
cd /storage1/denser/apps/blog

# Wszystkie testy z wynikami
for f in playwright/temp_ai_script_tests/smoke-*.mjs; do
  echo "========================================"
  echo "Running: $f"
  echo "========================================"
  pnpm exec node "$f"
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ PASS"
  else
    echo "✗ FAIL (exit code: $EXIT_CODE)"
  fi
  echo ""
done
```

### Uruchamianie testów według priorytetu

```bash
cd /storage1/denser/apps/blog

# P0 - Krytyczne
pnpm exec node playwright/temp_ai_script_tests/smoke-01-homepage-posts.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-04-navigate-to-post.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-08-profile-basic-info.mjs

# P1 - Ważne
pnpm exec node playwright/temp_ai_script_tests/smoke-05-post-votes-api.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-06-comments-count.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-07-payout-value.mjs

# P2 - Tooltips
pnpm exec node playwright/temp_ai_script_tests/smoke-02-postcard-votes-tooltip.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-03-postcard-payout-tooltip.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-09-profile-followers-api.mjs

# P3 - Nawigacja
pnpm exec node playwright/temp_ai_script_tests/smoke-10-tag-navigation.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-11-category-navigation.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-12-communities-list.mjs

# P4 - Dodatkowe
pnpm exec node playwright/temp_ai_script_tests/smoke-13-static-pages.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-14-theme-toggle.mjs
pnpm exec node playwright/temp_ai_script_tests/smoke-15-login-modal.mjs
```

### Skrypt do uruchomienia wszystkich testów z raportem

```bash
#!/bin/bash
# save as: run-smoke-tests.sh

cd /storage1/denser/apps/blog

PASS=0
FAIL=0
RESULTS=""

for f in playwright/temp_ai_script_tests/smoke-*.mjs; do
  NAME=$(basename "$f" .mjs)
  pnpm exec node "$f" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    RESULTS="$RESULTS\n✓ $NAME"
    ((PASS++))
  else
    RESULTS="$RESULTS\n✗ $NAME"
    ((FAIL++))
  fi
done

echo "========================================"
echo "SMOKE TESTS REPORT"
echo "========================================"
echo -e "$RESULTS"
echo "----------------------------------------"
echo "PASS: $PASS | FAIL: $FAIL | TOTAL: $((PASS+FAIL))"
echo "========================================"

exit $FAIL
```

### Interpretacja wyników

Każdy test kończy się jednym z trzech stanów:
- `✓ PASS` - Test przeszedł pomyślnie (exit code 0)
- `✗ FAIL` - Test nie przeszedł (exit code 1)
- `✗ BŁĄD` - Wystąpił błąd podczas wykonywania testu

### Co sprawdzają poszczególne testy

| Test | Sprawdza |
|------|----------|
| **SMOKE-01** | Czy /trending ładuje >= 20 postów, zgodność pierwszego posta z API |
| **SMOKE-02** | Czy hover na głosach pokazuje tooltip z liczbą głosów |
| **SMOKE-03** | Czy hover na payout pokazuje breakdown (HBD, data wypłaty) |
| **SMOKE-04** | Czy kliknięcie na post otwiera stronę z tytułem, treścią, stopką |
| **SMOKE-05** | Czy top głosujący z tooltipa zgadza się z API (rshares) |
| **SMOKE-06** | Czy liczba komentarzy: post card = strona = API children |
| **SMOKE-07** | Czy payout: post card = stopka = API pending_payout_value |
| **SMOKE-08** | Czy statystyki profilu zgadzają się z API get_accounts |
| **SMOKE-09** | Czy followers/following zgadzają się z API get_follow_count |
| **SMOKE-10** | Czy kliknięcie na tag filtruje posty do tej kategorii |
| **SMOKE-11** | Czy /trending, /hot, /created pokazują różne posty |
| **SMOKE-12** | Czy /communities ładuje listę, nawigacja do community działa |
| **SMOKE-13** | Czy /faq.html, /privacy.html, /tos.html zwracają 200 |
| **SMOKE-14** | Czy przycisk theme toggle jest widoczny i działa |
| **SMOKE-15** | Czy kliknięcie Login otwiera modal logowania |

### Typowe błędy i rozwiązania

| Błąd | Przyczyna | Rozwiązanie |
|------|-----------|-------------|
| `Timeout 60000ms exceeded` | Strona nie załadowała się | Zwiększ timeout lub sprawdź połączenie |
| `strict mode violation` | Selektor zwraca wiele elementów | Dodaj `.first()` do selektora |
| `element is not visible` | Element nie jest w viewport | Użyj `scrollIntoViewIfNeeded()` |
| `Różnica > tolerancja` | Cache API jest nieaktualny | Zwiększ tolerancję lub poczekaj |
| `locator.fill: element is disabled` | Pole jest wyłączone | Sprawdź `isDisabled()` przed akcją |

### Czyszczenie po testach

Po zakończeniu testowania **USUŃ** pliki z `temp_ai_script_tests/`:
```bash
rm -f apps/blog/playwright/temp_ai_script_tests/smoke-*.mjs
```

### Dobre praktyki

1. **Uruchamiaj testy P0 najpierw** - jeśli te nie przejdą, reszta też może failować
2. **Sprawdź połączenie z API** - `curl https://api.hive.blog` przed testami
3. **Używaj headless: false do debugowania** - zmień na `chromium.launch({ headless: false })`
4. **Zwiększ timeout dla wolnych połączeń** - `waitForTimeout(10000)` zamiast 6000
5. **Loguj więcej danych przy debugowaniu** - dodaj `console.log()` dla wartości pośrednich
