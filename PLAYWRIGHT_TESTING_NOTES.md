# Playwright Smoke Tests - Przewodnik

## Szybki Start

### Zasady testowania

1. **Strona produkcyjna**: `https://blog.openhive.network`
2. **API do weryfikacji**: `https://api.hive.blog`
3. **BEZ LOGOWANIA** - testujemy tylko funkcje dostępne dla niezalogowanych
4. **Skrypty tymczasowe**: `apps/blog/playwright/temp_ai_script_tests/*.mjs`
5. **Po testach USUŃ skrypty** z folderu `temp_ai_script_tests/`

### Uruchomienie testu

```bash
cd /storage1/denser/apps/blog
pnpm exec node playwright/temp_ai_script_tests/smoke-01-homepage-posts.mjs
```

### Uruchomienie wszystkich testów

```bash
cd /storage1/denser/apps/blog
for f in playwright/temp_ai_script_tests/smoke-*.mjs; do
  echo "=== $f ===" && pnpm exec node "$f"
done
```

---

## Katalog 15 Smoke Testów

### Priorytet P0 - Krytyczne (uruchom najpierw)

| ID | Test | Co sprawdza | Kluczowe selektory |
|----|------|-------------|-------------------|
| **SMOKE-01** | Strona główna | /trending ładuje ≥20 postów, pierwszy post zgodny z API | `post-list-item`, `post-author`, `post-title` |
| **SMOKE-04** | Nawigacja do posta | Kliknięcie na post → strona z tytułem, treścią, stopką | `article-title`, `#articleBody`, `comment-votes` |
| **SMOKE-08** | Profil użytkownika | Statystyki profilu @gtg zgodne z API | `profile-name`, `profile-stats` |

### Priorytet P1 - Ważne

| ID | Test | Co sprawdza | Kluczowe selektory |
|----|------|-------------|-------------------|
| **SMOKE-05** | Głosy z API | Tooltip głosów: top głosujący zgodny z API (rshares) | `comment-votes`, `[data-state="open"]` |
| **SMOKE-06** | Komentarze | Liczba komentarzy: post card = strona = API children | `post-card-response-link`, `comment-list-item` |
| **SMOKE-07** | Payout | Wartość payout: post card = stopka = API | `post-payout`, `comment-payout` |

### Priorytet P2 - Tooltips

| ID | Test | Co sprawdza | Kluczowe selektory |
|----|------|-------------|-------------------|
| **SMOKE-02** | Tooltip głosów (post card) | Hover na głosach → tooltip z liczbą | `post-total-votes`, `post-card-votes-tooltip` |
| **SMOKE-03** | Tooltip payout (post card) | Hover na payout → breakdown (HBD, data) | `post-payout`, `payout-post-card-tooltip` |
| **SMOKE-09** | Followers/Following | Statystyki profilu szczegółowe vs API | `profile-stats li:nth(0-3)` |

### Priorytet P3 - Nawigacja

| ID | Test | Co sprawdza | Kluczowe selektory |
|----|------|-------------|-------------------|
| **SMOKE-10** | Tagi | Kliknięcie tag → filtrowanie postów | `a[href*="/trending/"]` |
| **SMOKE-11** | Kategorie | /trending vs /hot vs /created - różne posty | `a[href="/hot"]`, `a[href="/created"]` |
| **SMOKE-12** | Communities | /communities ładuje listę, nawigacja działa | `community-list-item` |

### Priorytet P4 - Dodatkowe

| ID | Test | Co sprawdza | Kluczowe selektory |
|----|------|-------------|-------------------|
| **SMOKE-13** | Strony statyczne | /faq.html, /privacy.html, /tos.html → HTTP 200 | - |
| **SMOKE-14** | Theme toggle | Przycisk zmiany motywu działa | `button:has(svg[class*="sun"])` |
| **SMOKE-15** | Login modal | Kliknięcie Login → modal się otwiera | `login-btn`, `login-dialog` |

---

## Szablon Smoke Testu

```javascript
/**
 * SMOKE-XX: Nazwa testu
 * Cel: Krótki opis
 * Kroki: 1. ... 2. ... 3. ...
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
    let allPassed = true;

    // CZĘŚĆ 1: Akcje UI - nawigacja z oczekiwaniem na element
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Czekaj na konkretny element zamiast timeout
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    // CZĘŚĆ 2: Pobierz dane z UI
    const element = page.locator('[data-testid="..."]').first();
    const value = await element.textContent();

    // CZĘŚĆ 3: Weryfikacja z API
    const apiRequest = { jsonrpc: '2.0', method: '...', params: {...}, id: 1 };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();

    // CZĘŚĆ 4: Porównanie
    if (uiValue === apiValue) {
      console.log('✓ PASS');
    } else {
      console.log('✗ FAIL');
      allPassed = false;
    }

    // PODSUMOWANIE
    console.log(allPassed ? '✓ SMOKE-XX: PASS' : '✗ SMOKE-XX: FAIL');
    return allPassed;

  } catch (error) {
    console.error('✗ BŁĄD:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runTest().then(passed => process.exit(passed ? 0 : 1));
```

---

## Selektory data-testid

### Strona główna (/trending, /hot, /created)

| Selektor | Element | Użycie |
|----------|---------|--------|
| `post-list-item` | Karta posta | `page.locator('[data-testid="post-list-item"]').first()` |
| `post-author` | Autor (@username) | `.locator('[data-testid="post-author"]')` |
| `post-title` | Tytuł (zawiera `a` z linkiem) | `.locator('[data-testid="post-title"] a')` |
| `post-payout` | Wartość payout ($XX.XX) | `.locator('[data-testid="post-payout"]')` |
| `post-total-votes` | Liczba głosów | `.locator('[data-testid="post-total-votes"]')` |
| `post-card-response-link` | Liczba komentarzy | `.locator('[data-testid="post-card-response-link"]')` |

### Strona posta (/@author/permlink)

| Selektor | Element | Uwagi |
|----------|---------|-------|
| `article-title` | Tytuł artykułu | - |
| `#articleBody` | Treść | **Użyj `.first()`** - wiele elementów! |
| `comment-votes` | Głosy w stopce | **Użyj `.first()`** |
| `comment-payout` | Payout w stopce | **Użyj `.first()`** |
| `upvote-button` | Przycisk upvote | - |
| `downvote-button` | Przycisk downvote | - |
| `comment-reply` | Przycisk reply | - |
| `comment-list-item` | Pojedynczy komentarz | - |
| `author-name-link` | Link do autora | - |

### Profil użytkownika (/@username)

| Selektor | Element | Indeks w `profile-stats` |
|----------|---------|--------------------------|
| `profile-name` | Nazwa (np. "Gandalf (75)") | - |
| `profile-about` | Opis/bio | - |
| `profile-stats` | Kontener statystyk | - |
| `profile-stats li:nth(0)` | Followers | `profileStats.locator('li').nth(0)` |
| `profile-stats li:nth(1)` | Posts | `profileStats.locator('li').nth(1)` |
| `profile-stats li:nth(2)` | Following | `profileStats.locator('li').nth(2)` |
| `profile-stats li:nth(3)` | HP | `profileStats.locator('li').nth(3)` |

### Tooltips (Radix UI)

| Selektor | Użycie |
|----------|--------|
| `[data-state="open"]` | Otwarty tooltip/popover po hover |
| `post-card-votes-tooltip` | Tooltip głosów na post card |
| `payout-post-card-tooltip` | Tooltip payout na post card |

### Inne

| Selektor | Element |
|----------|---------|
| `login-btn` | Przycisk Login w navbar |
| `login-dialog` | Modal logowania |
| `community-list-item` | Element na liście communities |

---

## Hive API - Najczęściej używane

### bridge.get_ranked_posts (lista postów)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_ranked_posts',
  params: {
    sort: 'trending',  // 'trending' | 'hot' | 'created'
    tag: '',           // community/tag lub ''
    observer: '',      // dla personalizacji (opcjonalne)
    limit: 20
  },
  id: 1
};
// Zwraca: result[].author, result[].permlink, result[].title, result[].pending_payout_value
```

### bridge.get_post (szczegóły posta)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.get_post',
  params: { author: 'username', permlink: 'post-slug', observer: '' },
  id: 1
};
// Zwraca: title, children, pending_payout_value, active_votes[], is_paidout
// UWAGA: active_votes ograniczone do 1000 wpisów!
```

### condenser_api.get_accounts (dane konta)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_accounts',
  params: [['username']],  // tablica w tablicy!
  id: 1
};
// Zwraca: result[0].name, post_count, posting_json_metadata
```

### condenser_api.get_follow_count (followers/following)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'condenser_api.get_follow_count',
  params: ['username'],
  id: 1
};
// Zwraca: follower_count, following_count
```

### bridge.list_communities (lista communities)

```javascript
const apiRequest = {
  jsonrpc: '2.0',
  method: 'bridge.list_communities',
  params: { last: '', limit: 20, query: null, sort: 'rank', observer: '' },
  id: 1
};
// Zwraca: result[].name (hive-xxxxx), title, subscribers
```

---

## Wzorce kodu

### Pobieranie pierwszego posta z /trending

```javascript
const firstPost = page.locator('[data-testid="post-list-item"]').first();

// Autor
const authorElement = firstPost.locator('[data-testid="post-author"]');
const authorText = await authorElement.textContent();
const author = authorText?.trim().replace('@', '') || '';

// Tytuł i link
const titleElement = firstPost.locator('[data-testid="post-title"] a');
const postLink = await titleElement.getAttribute('href');

// Permlink z URL (/community/@author/permlink)
const permlink = postLink?.split('/').pop() || '';
```

### Hover i odczyt tooltipa

```javascript
const element = page.locator('[data-testid="post-total-votes"]').first();
await element.scrollIntoViewIfNeeded();
await element.hover();

// Czekaj na pojawienie się tooltipa zamiast timeout
const tooltip = page.locator('[data-state="open"]');
await tooltip.waitFor({ state: 'visible', timeout: 5000 });
const tooltipText = await tooltip.textContent();
```

### Parsowanie wartości z UI

```javascript
// Payout: "$61.28" -> 61.28
const payoutValue = parseFloat(text.replace('$', '').trim()) || 0;

// Liczba z separatorami: "10,925 followers" -> 10925
const count = parseInt(text.replace(/[^\d]/g, '')) || 0;

// Autor: "@username" -> "username"
const author = text?.trim().replace('@', '') || '';
```

### Logika payout z API

```javascript
const pendingPayout = parseFloat(post.pending_payout_value?.replace(' HBD', '') || '0');
const curatorPayout = parseFloat(post.curator_payout_value?.replace(' HBD', '') || '0');
const authorPayout = parseFloat(post.author_payout_value?.replace(' HBD', '') || '0');

// Przed wypłatą: pending_payout_value
// Po wypłacie: curator + author
const payout = post.is_paidout ? (curatorPayout + authorPayout) : pendingPayout;
```

---

## Tolerancje porównań

| Typ danych | Tolerancja | Powód |
|------------|------------|-------|
| Payout | ±$0.10 | Zaokrąglenia, cache |
| Followers/Following | ±50 | Cache może być nieaktualny |
| Posts count | ±10 | Cache |
| Vote count | ±10 lub limit 1000 | API ogranicza active_votes do 1000 |

---

## Oczekiwanie na załadowanie stron (Best Practices)

**WAŻNE: Unikaj `waitForTimeout` - używaj jawnych oczekiwań na elementy!**

### Strona główna (/trending, /hot, /created)

```javascript
await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Czekaj na pierwszy post - to znaczy że lista się załadowała
await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });
```

### Strona posta

```javascript
await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Czekaj na treść artykułu
await page.locator('#articleBody').first().waitFor({ state: 'visible', timeout: 30000 });
```

### Profil użytkownika

```javascript
await page.goto(`${BASE_URL}/@username`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Czekaj na statystyki profilu
await page.locator('[data-testid="profile-stats"]').waitFor({ state: 'visible', timeout: 30000 });
```

### Lista communities

```javascript
await page.goto(`${BASE_URL}/communities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Czekaj na pierwszy element listy
await page.locator('[data-testid="community-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });
```

### Po kliknięciu (nawigacja)

```javascript
await titleElement.click();
// Czekaj na URL lub element docelowej strony
await page.waitForURL('**/@*/**', { timeout: 30000 });
// LUB czekaj na element
await page.locator('[data-testid="article-title"]').waitFor({ state: 'visible', timeout: 30000 });
```

### Po hover (tooltip)

```javascript
await element.hover();
// Czekaj na tooltip
await page.locator('[data-state="open"]').waitFor({ state: 'visible', timeout: 5000 });
```

### Wzorzec ogólny

| Zamiast | Użyj |
|---------|------|
| `waitForTimeout(5000)` | `element.waitFor({ state: 'visible', timeout: 30000 })` |
| `waitForTimeout(X)` po goto | `page.waitForLoadState('networkidle')` lub `element.waitFor()` |
| `waitForTimeout(X)` po click | `page.waitForURL()` lub `targetElement.waitFor()` |
| `waitForTimeout(X)` po hover | `tooltip.waitFor({ state: 'visible' })` |

---

## Typowe błędy i rozwiązania

| Błąd | Przyczyna | Rozwiązanie |
|------|-----------|-------------|
| `Timeout 60000ms exceeded` | Strona nie załadowała się | Zwiększ timeout, sprawdź sieć |
| `strict mode violation` | Selektor zwraca wiele elementów | Dodaj `.first()` |
| `element is not visible` | Element poza viewport | Użyj `scrollIntoViewIfNeeded()` |
| `Różnica > tolerancja` | Cache nieaktualny | Zwiększ tolerancję |
| `locator.fill: element is disabled` | Pole wyłączone | Sprawdź `isDisabled()` przed akcją |
| `active_votes.length = 1000` | API limit | Dodaj tolerancję dla postów >1000 głosów |

---

## Debugowanie

```javascript
// Włącz widoczną przeglądarkę
const browser = await chromium.launch({ headless: false });

// Spowolnij wykonywanie (500ms między akcjami)
const browser = await chromium.launch({ headless: false, slowMo: 500 });

// Zatrzymaj test interaktywnie (wymaga headless: false)
await page.pause();

// Loguj więcej danych
console.log('HTML:', await element.innerHTML());
console.log('All text:', await page.locator('body').textContent());

// Zrób screenshot
await page.screenshot({ path: 'debug.png' });
```

---

## Czyszczenie po testach

**WAŻNE: Po zakończeniu testowania USUŃ skrypty!**

```bash
rm -f apps/blog/playwright/temp_ai_script_tests/smoke-*.mjs
```

---

## Dokumentacja

- **Architektura aplikacji**: `DENSER_BLOG_ARCHITECTURE.md`
- **Hive API docs**: https://developers.hive.io/
- **Playwright docs**: https://playwright.dev/docs/intro
