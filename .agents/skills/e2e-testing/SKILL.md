---
name: E2E Testing with Playwright
description: How to write, run, and maintain end-to-end tests for the Next.js frontend using Playwright.
---

# E2E Testing with Playwright

## Overview

The frontend uses [Playwright](https://playwright.dev) for end-to-end testing. Tests live in `frontend/e2e/` and run against the real backend in dev mode (`SMS_ENABLED=false`, OTP code `123456`).

## Directory Structure

```
frontend/
├── e2e/
│   ├── helpers/
│   │   └── auth.ts          # Login helper (OTP flow)
│   ├── landing.spec.ts      # Landing page tests
│   ├── auth.spec.ts         # Authentication flow tests
│   ├── admin-dashboard.spec.ts
│   ├── new-service.spec.ts
│   ├── service-detail.spec.ts
│   └── download-app.spec.ts
├── playwright.config.ts
└── package.json             # scripts: test:e2e, test:e2e:ui, test:e2e:headed
```

## Running Tests

```bash
# Run all tests (headless)
cd frontend && npm run test:e2e

# Interactive UI mode (recommended for development)
npm run test:e2e:ui

# Run in headed browser (visible)
npm run test:e2e:headed

# Run a specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test -g "debe cargar"
```

## Writing a New Test

### Step 1: Create the Test File

Create `frontend/e2e/<feature>.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Nombre de la Feature', () => {
  test('debe hacer algo esperado', async ({ page }) => {
    await page.goto('/ruta');
    await expect(page.getByText('Texto esperado')).toBeVisible();
  });
});
```

### Step 2: Conventions

| Convention | Rule |
|-----------|------|
| **Language** | Test descriptions in Spanish (the app is in Spanish) |
| **File names** | `kebab-case.spec.ts` |
| **Selectors** | Prefer `data-testid` > `getByRole` > `getByText` > CSS |
| **Grouping** | Use `test.describe()` per feature/page |
| **Independence** | Tests must NOT depend on each other |
| **Cleanup** | Tests should not leave state that affects other tests |
| **Timeouts** | Default 30s per test, 5s per assertion |

### Step 3: Authentication in Tests

For tests that need authentication, use the helper:

```typescript
import { loginWithOTP } from './helpers/auth';

test.describe('Feature protegida', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithOTP(page, '+573001234567');
  });

  test('debe mostrar contenido protegido', async ({ page }) => {
    await page.goto('/servicios');
    // ...
  });
});
```

### Step 4: Handling Auth-Protected Pages

If a page requires auth and you don't want to test the full login flow:

```typescript
test('debe mostrar página o redirigir a login', async ({ page }) => {
  await page.goto('/servicios');
  
  const onPage = page.url().includes('/servicios');
  const onLogin = page.url().includes('/login');
  expect(onPage || onLogin).toBe(true);
  
  if (page.url().includes('/login')) {
    test.skip(); // Skip rest if not authenticated
  }
});
```

## Adding data-testid Attributes

When adding new UI components, always include `data-testid`:

```tsx
<button data-testid="submit-service-btn" onClick={handleSubmit}>
  Solicitar Servicio
</button>
```

Naming convention: `{action}-{element}-{context}`
- `submit-service-btn`
- `phone-input-login`
- `otp-input`
- `service-card-{id}`

## Checklist for New Tests

- [ ] Test file named `<feature>.spec.ts` in `frontend/e2e/`
- [ ] Tests grouped in `test.describe()`
- [ ] Test descriptions in Spanish
- [ ] Uses semantic selectors (`getByRole`, `getByText`) or `data-testid`
- [ ] Does NOT depend on other tests
- [ ] Handles both authenticated and unauthenticated states
- [ ] Assertions use `await expect(...)`
- [ ] Runs successfully with `npx playwright test <file>`

## Debugging Failed Tests

```bash
# Show test report
npx playwright show-report

# Run with trace viewer
npx playwright test --trace on

# Debug a specific test
npx playwright test e2e/auth.spec.ts --debug
```

## CI Integration

Playwright tests run in the CI pipeline as the `frontend-e2e` job:
- Runs after `frontend-lint`
- Uses headless Chromium
- Uploads traces/screenshots as artifacts on failure
- Backend starts with `SMS_ENABLED=false` for dev OTP
