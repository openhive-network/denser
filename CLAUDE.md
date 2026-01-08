# Denser Project Notes

## GitLab Instance
This project uses **gitlab.syncad.com**, NOT gitlab.com.
- Repository: https://gitlab.syncad.com/hive/denser
- Use `glab api "projects/hive%2Fdenser/..."` for API calls

## Git Workflow
- **Branching**: Feature branches from `develop`, MRs target `develop`
- **Main branch**: Periodically synced from `develop` (not direct commits)
- **Issue linking**: Always link issues in MR descriptions using `Closes #123` or `Fixes #123`
- **Separate MRs**: Create separate MRs for separate topics/issues

## Package Management
- Check `.gitlab-ci.yml` for current Node/pnpm versions
- Example: `docker run --rm -v "$(pwd)":/app -w /app node:<version> sh -c "corepack enable && pnpm install"`
- CI uses `--frozen-lockfile` - always commit lockfile changes

## Logging
- Pino logger: `logger.error(error, 'message')` (error first!)
- Printf-style: `logger.error('msg: %o', error)`

## Hive Blockchain
- APIs: api.hive.blog, api.openhive.network
- SSR connects to Hive API, client can use any endpoint

---

## Tech Stack & Frameworks

### Core
- **Monorepo**: Turborepo with pnpm workspaces
- **Node**: ^20.11 || >= 21.2
- **pnpm**: >=9.5.0 (packageManager: pnpm@10.0.0)
- **TypeScript**: 5.3.3

### Frontend Framework
- **Next.js**: 14.2.x (App Router)
- **React**: 18.3.0

### Styling
- **Tailwind CSS**: with custom config (`@hive/tailwindcss-config`)
- **PostCSS**: standard config
- **class-variance-authority**: for variant styling
- **clsx** + **tailwind-merge**: class composition

### UI Components
- **Radix UI**: headless primitives (dialog, dropdown, popover, tabs, tooltip, etc.)
- **Lucide React**: icons
- **shadcn/ui pattern**: Radix + Tailwind in `@hive/ui` package

### State Management
- **Zustand**: client state
- **TanStack React Query**: 4.x for server state / data fetching

### Forms & Validation
- **React Hook Form**: 7.x
- **Zod**: schema validation
- **@hookform/resolvers**: Zod integration

### Internationalization
- **i18next** + **next-i18next**: translations in `locales/` directory

### Blockchain
- **@hiveio/wax**: Hive blockchain operations
- **@hiveio/hb-auth**: authentication worker
- **hive-auth-client**: HiveAuth integration

### Testing
- **Playwright**: E2E tests with multiple configs (local, mirrornet)

### Internal Packages (`packages/`)
| Package | Purpose |
|---------|---------|
| `@hive/ui` | Shared UI components (Radix + Tailwind) |
| `@hive/transaction` | Blockchain transaction handling |
| `@hive/smart-signer` | Multi-method signing (Keychain, HiveAuth, etc.) |
| `@hive/renderer` | Content rendering |
| `@hive/logger` | Pino-based logging |
| `@hive/middleware` | Shared Next.js middleware |
| `@hive/tailwindcss-config` | Shared Tailwind config |
| `@hive/tsconfig` | Shared TypeScript config |
| `@hive/eslint-config-custom` | Shared ESLint rules |
| `@hive/prettier-config-custom` | Shared Prettier config |

---

## Blog App File Structure (`apps/blog/`)

```
apps/blog/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   ├── error.tsx                 # Error boundary
│   ├── api/                      # API routes
│   ├── (main-and-community)/     # Route group for main feeds
│   │   ├── layout.tsx
│   │   ├── trending/
│   │   ├── hot/
│   │   ├── created/
│   │   ├── payout/
│   │   ├── muted/
│   │   └── roles/
│   ├── [param]/                  # Dynamic routes (users, communities)
│   ├── communities/              # Communities listing
│   ├── search/                   # Search page
│   ├── welcome/                  # Welcome/onboarding
│   ├── healthchecker/            # Health check endpoint
│   ├── faq.html/                 # Static FAQ page
│   ├── privacy.html/             # Privacy policy
│   ├── tos.html/                 # Terms of service
│   └── submit.html/              # Submit post form
│
├── features/                     # Feature modules (domain-driven)
│   ├── post-rendering/           # Post display components
│   │   ├── comment-list.tsx
│   │   ├── comment-list-item.tsx
│   │   ├── share-post-*.tsx
│   │   ├── user-info.tsx
│   │   ├── hooks/
│   │   └── lib/
│   ├── post-editor/              # Post creation/editing
│   ├── list-of-posts/            # Post lists/feeds
│   ├── layouts/                  # Layout components
│   ├── account-profile/          # User profile views
│   ├── account-settings/         # User settings
│   ├── account-social/           # Follow/mute functionality
│   ├── account-lists/            # Followers/following lists
│   ├── activity-log/             # User activity
│   ├── community-profile/        # Community pages
│   ├── communities-list/         # Communities browser
│   ├── search/                   # Search feature
│   ├── votes/                    # Voting UI
│   ├── mute-follow/              # Mute/follow actions
│   ├── suggestions-posts/        # Suggested posts
│   ├── tags-pages/               # Tag browsing
│   └── static-pages/             # Static content
│
├── components/                   # Shared app-level components
│   ├── hooks/                    # Custom React hooks
│   ├── base-path-link.tsx
│   ├── dialog-login.tsx
│   ├── healthcheckers-wrapper.tsx
│   └── ...
│
├── lib/                          # Utilities & helpers
│   ├── utils.ts                  # General utilities
│   ├── react-query.ts            # Query client config
│   ├── cached-api.ts             # API caching helpers
│   ├── auth-utils.ts             # Auth utilities
│   ├── get-metadata.ts           # SEO metadata
│   └── markdowns/                # Markdown utilities
│
├── store/                        # Zustand stores
│   ├── app.ts                    # Main app store
│   └── app-types.ts              # Store types
│
├── i18n/                         # i18n configuration
├── locales/                      # Translation files (en, es, fr, etc.)
├── public/                       # Static assets
├── pages/                        # Legacy pages (if any)
├── playwright/                   # E2E test support files
├── middleware.ts                 # Next.js middleware
├── next.config.js                # Next.js configuration
└── tailwind.config.js            # Tailwind (imports shared config)
```

### Conventions

1. **Route Groups**: Use `(group-name)` for logical grouping without URL impact
2. **Features**: Domain-driven modules in `features/` with co-located components, hooks, and lib
3. **Components**: Each feature has its own components; shared ones go in `components/`
4. **Hooks**: Co-locate with feature or place in `components/hooks/` if shared
5. **API Routes**: Place in `app/api/` following Next.js App Router conventions
6. **Static Pages**: Use `.html` suffix directories for static HTML pages

---

## Clean Code Guidelines

### File Size & Structure
- **Max ~200-300 lines per file** - large files are hard to debug and maintain
- **One component per file** - easier to locate and test
- **Split large components** - extract sub-components, hooks, and utilities
- **Co-locate related code** - keep hooks/utils near their consumers

### Functions & Components
- **Single Responsibility** - each function/component does one thing well
- **Max ~50 lines per function** - if longer, split into smaller functions
- **Descriptive names** - `getUserProfile()` not `getData()`, `PostCard` not `Card1`
- **Extract custom hooks** - reusable logic goes into `useXxx()` hooks
- **Avoid prop drilling** - use context or composition for deep props

### Code Quality
- **DRY (Don't Repeat Yourself)** - extract shared logic into utilities/hooks
- **Early returns** - reduce nesting with guard clauses
- **Avoid magic numbers/strings** - use named constants
- **Type everything** - leverage TypeScript, avoid `any`
- **Handle errors** - always handle error states in async operations

### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useUserData.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `IApiResponse`)

### React Specific
- **Prefer functional components** with hooks
- **Memoize expensive computations** - `useMemo`, `useCallback` where needed
- **Avoid inline functions in JSX** - extract handlers
- **Use fragments** `<>...</>` instead of unnecessary wrapper divs
- **Key prop** - always use stable, unique keys in lists

### What to Avoid
- God components (500+ lines doing everything)
- Deeply nested ternaries
- Business logic in components (extract to hooks/utils)
- Commented-out code (delete it, git has history)
- Console.logs in production code (use logger)
- Ignoring TypeScript errors with `@ts-ignore`

---

## ESLint Rules for Code Quality

### TypeScript Strict Typing (warnings)
The project enforces strict typing via ESLint. Run `pnpm lint` after changes to check.

**Enabled rules:**
1. **`@typescript-eslint/no-explicit-any`** - Disallows `any` type
   - Bad: `const data: any = ...`
   - Good: `const data: UserProfile = ...` or use `unknown` with type guards

2. **`@typescript-eslint/consistent-type-assertions`** - Disallows type assertions (`as Type`)
   - Bad: `const user = data as User`
   - Good: Define proper types upfront, use type guards, or generics

### How to Fix Common Issues

**Instead of `any`:**
```typescript
// Bad
function handleError(error: any) { ... }

// Good - use unknown with type guard
function handleError(error: unknown) {
  if (error instanceof Error) {
    logger.error(error, 'Operation failed');
  }
}

// Good - use specific type
function handleError(error: Error) { ... }
```

**Instead of `as Type`:**
```typescript
// Bad
const config = JSON.parse(data) as AppConfig;

// Good - use type guard
function isAppConfig(obj: unknown): obj is AppConfig {
  return typeof obj === 'object' && obj !== null && 'apiUrl' in obj;
}
const parsed = JSON.parse(data);
if (isAppConfig(parsed)) {
  const config = parsed; // typed as AppConfig
}

// Good - use zod schema validation
const configSchema = z.object({ apiUrl: z.string() });
const config = configSchema.parse(JSON.parse(data));
```

### Running Lint
```bash
# Lint specific package
pnpm --filter @hive/blog lint

# Lint all packages
pnpm lint
```

### Translation Rules

**IMPORTANT: Never use inline strings for user-facing text!**

All user-visible text must use translation keys via the `t()` function. This ensures:
- Proper internationalization (i18n) support
- Consistent text management
- Easy translation to other languages

**Bad - inline strings:**
```tsx
// DON'T do this
<Button>Submit</Button>
<p>Loading...</p>
<span>No results found</span>
{error && <div>Something went wrong</div>}
```

**Good - translation keys:**
```tsx
// DO this
<Button>{t('common.submit')}</Button>
<p>{t('global.loading')}</p>
<span>{t('search_page.no_results')}</span>
{error && <div>{t('global.something_went_wrong')}</div>}
```

**Usage pattern:**
```tsx
import { useTranslation } from '@/blog/i18n/client';

function MyComponent() {
  const { t } = useTranslation('common_blog');

  return <div>{t('namespace.key_name')}</div>;
}
```

### Translation Keys Validation

#### 1. Cross-locale key sync
Validates that all locales have the same keys as English reference.

```bash
pnpm --filter @hive/blog lint:translations
```

**What it checks:**
- Missing keys (present in English but missing in other locales)
- Extra keys (present in other locales but not in English reference)
- Missing translation files

#### 2. Translation usage validation
Validates that all `t('key')` and `<Trans i18nKey="key">` calls in code reference existing translation keys.

```bash
# Check for missing keys
pnpm --filter @hive/blog lint:translations:usage

# Also show potentially unused keys (-- passes flag to the script)
pnpm --filter @hive/blog lint:translations:usage -- --unused
```

**What it checks:**
- All `t('key')` function calls reference existing keys
- All `<Trans i18nKey="key">` components reference existing keys
- Reports file and line number for invalid keys
- Optionally reports unused translation keys

**Reference locale:** English (`en`) is the source of truth.

**Fixing issues:**
1. Missing keys in code: Add the key to `apps/blog/locales/en/common_blog.json`
2. Missing keys in locales: Copy from English and translate
3. Extra keys: Remove outdated keys or add to English if valid

**Scripts location:** `scripts/check-blog-translations.js`, `scripts/check-blog-translation-usage.js`

**Translations location:** `apps/blog/locales/[lang]/common_blog.json`
