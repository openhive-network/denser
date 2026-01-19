# Critical Code Review

Perform a thorough code review of recent changes. Be critical - the goal is clean, maintainable code.

## Review Checklist

### 1. Type Safety
- [ ] No `any` types (use `unknown` + type guards)
- [ ] No unsafe type assertions (`as Type`)
- [ ] No non-null assertions (`!`)
- [ ] Proper null/undefined handling

### 2. Code Quality
- [ ] Clear, descriptive naming (camelCase, PascalCase for components)
- [ ] Small functions (max ~50 lines)
- [ ] Single responsibility principle
- [ ] No duplicated logic (DRY)
- [ ] No magic numbers/strings

### 3. Internationalization
- [ ] All user-facing text uses `t('key')` function
- [ ] Translation keys exist in English locale
- [ ] No hardcoded strings in UI

### 4. Error Handling
- [ ] Async operations have error handling
- [ ] No silent failures
- [ ] Proper error messages for users

### 5. Security
- [ ] No XSS vulnerabilities
- [ ] No SQL/command injection risks
- [ ] Sensitive data properly handled

### 6. Performance
- [ ] No unnecessary re-renders
- [ ] Expensive operations memoized
- [ ] Lists use stable keys

### 7. Storage
- [ ] localStorage uses TTL utilities
- [ ] No raw localStorage calls

## Severity Classification

- **Critical**: Security issues, data loss, breaking changes - BLOCK
- **Major**: Type violations, missing error handling - FIX BEFORE MERGE
- **Minor**: Style issues, suboptimal patterns - SHOULD FIX
- **Suggestion**: Alternative approaches - NICE TO HAVE

Flag all issues found with severity, file path, and line number.
