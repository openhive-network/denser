# Testing & Review Skills

## Quick Commands

| Command | Purpose |
|---------|---------|
| `/test-full` | Run comprehensive tests for significant changes |
| `/test-quick` | Run minimal tests for minor changes |
| `/review` | Perform critical code review |

---

## Testing Strategy

### Full Testing (Required for significant changes)

> **Run with:** `/test-full`

**When to use:**
- New features or components
- Changes affecting multiple files
- Modifications to core logic (authentication, transactions, API calls)
- Database/storage schema changes
- Changes to shared packages (`@hive/ui`, `@hive/transaction`, etc.)

**Required steps:**
1. **Build verification**
   ```bash
   pnpm build:blog
   pnpm build:wallet
   ```
2. **Lint check**
   ```bash
   pnpm lint
   ```
3. **Translation validation**
   ```bash
   pnpm --filter @hive/blog lint:translations
   pnpm --filter @hive/blog lint:translations:usage
   ```
4. **E2E tests** (if applicable)
   ```bash
   pnpm blog:pw:test:local:chromium
   ```
5. **Manual testing** - run the app and verify functionality

### Quick Testing (For minor changes)

> **Run with:** `/test-quick`

**When to use:**
- Single-file fixes (typos, small UI tweaks)
- Documentation updates
- Simple refactoring without logic changes
- Style-only changes (CSS/Tailwind)

**Required steps:**
1. **Lint affected package**
   ```bash
   pnpm --filter @hive/blog lint
   ```
2. **Type check** (if TypeScript changes)
   ```bash
   pnpm --filter @hive/blog exec tsc --noEmit
   ```
3. **Visual verification** - quick manual check if UI-related

---

## Code Review Guidelines

> **Run with:** `/review`

### Review Philosophy

**Be critical, not lenient.** The goal is clean, maintainable code - not just working code.

### Review Checklist

| Category | Check |
|----------|-------|
| **Types** | No `any`, no unnecessary type assertions |
| **Naming** | Clear, descriptive names following conventions |
| **Structure** | Small functions, single responsibility |
| **DRY** | No duplicated logic |
| **i18n** | All user text uses `t()` function |
| **Errors** | Proper error handling, no silent failures |
| **Security** | No XSS, SQL injection, command injection risks |
| **Performance** | No unnecessary re-renders, memoization where needed |
| **Accessibility** | Proper ARIA labels, keyboard navigation |

### Common Issues to Flag

```typescript
// Flag: any type
function process(data: any) { ... }  // Use unknown + type guard

// Flag: inline strings
<Button>Submit</Button>  // Use t('key')

// Flag: non-null assertion
const value = obj!.prop;  // Use optional chaining + fallback

// Flag: raw localStorage
localStorage.setItem('key', value);  // Use storage-with-ttl utilities

// Flag: magic numbers
if (items.length > 20) { ... }  // Use named constant
```

---

## Problem-Fixing Skills

### TypeScript Errors

**Tools:**
- `pnpm --filter <package> exec tsc --noEmit` - type check
- Read error messages carefully, fix root cause not symptoms

**Techniques:**
1. Add proper types instead of `any`
2. Use type guards for narrowing
3. Use Zod schemas for runtime validation
4. Prefer `unknown` over `any` for external data

### ESLint Warnings

**Tools:**
- `pnpm --filter <package> lint -- --fix` - auto-fix
- Manual review for warnings that can't be auto-fixed

**Techniques:**
1. Rename variables to follow conventions
2. Extract unused parameters with `_` prefix
3. Replace `==` with `===`
4. Use logger instead of console

### Build Failures

**Tools:**
- `pnpm build:<app>` - full build
- Check CI logs for environment-specific issues

**Techniques:**
1. Check import paths are correct
2. Verify all dependencies are installed
3. Check for circular dependencies
4. Ensure environment variables are set

### Translation Issues

**Tools:**
- `pnpm --filter @hive/blog lint:translations` - key sync
- `pnpm --filter @hive/blog lint:translations:usage` - usage check

**Techniques:**
1. Add missing keys to English locale first
2. Copy keys to other locales
3. Remove unused keys after confirming no dynamic usage
4. Check for typos in key names

### UI/Styling Issues

**Tools:**
- Browser DevTools - inspect elements
- `pnpm dev` - hot reload for quick iteration

**Techniques:**
1. Use existing Tailwind classes from design system
2. Check for responsive breakpoint issues
3. Verify dark mode compatibility
4. Test in multiple browsers

### Performance Issues

**Tools:**
- React DevTools Profiler
- Browser Performance tab
- Lighthouse audits

**Techniques:**
1. Add `useMemo`/`useCallback` for expensive operations
2. Implement virtualization for long lists
3. Lazy load components/routes
4. Optimize images and assets

---

## Severity Classification

### Critical (Block MR)
- Security vulnerabilities
- Data loss risks
- Breaking existing functionality
- Build failures

### Major (Require fix before merge)
- Type safety violations (`any`, unsafe assertions)
- Missing error handling
- Accessibility issues
- Missing translations for user-facing text

### Minor (Should fix, can discuss)
- Code style inconsistencies
- Suboptimal performance patterns
- Missing memoization
- Verbose code that could be simplified

### Suggestions (Nice to have)
- Alternative approaches
- Additional test cases
- Documentation improvements
