---
description: Test conventions for this repository — applied when editing anything under tests/
globs: tests/**/*.js, playwright.config.js
---

# Test Conventions

## Test Pyramid — Always Apply

Before writing or changing a test, verify it sits at the **lowest viable level**:

1. **API** (`tests/api/`) — endpoint behaviour: results, status codes, validation, auth. Uses
   Playwright's `APIRequestContext`. No browser. Fast and exact.
2. **E2E** (`tests/e2e/specs/`) — only when the value comes from the browser: what the operator is
   offered, rendering, navigation, multi-step interaction.

**If the same behaviour can be verified through the API, it MUST be tested there.** Filter
correctness — counts, self-consistency, partition, subset — is a data assertion and belongs in
`tests/api/specs/devices-filters.spec.js`. What the dropdown offers, and what the pagination
controls do, cannot be seen from the API and belongs in E2E.

There is no unit level here: this repository tests a deployed application and holds none of its
source.

## Assertions Derive From the System, Not From Fixtures

Never hard-code counts like `expect(total).toBe(34)`. Derive the expectation from the API in the
same test — `online + offline === unfiltered total`. Invariant assertions stay correct when the
dataset changes and are immune to the command spec mutating state.

## Expected Failures

Assertions are always written against **correct** behaviour. A test covering a confirmed defect
calls `test.fail()` as the first line of its body, with a comment naming the bug:

```js
test("AC2: a command targeting an offline device is rejected with a 4xx", async ({ request }) => {
  // Surfaces as an unhandled exception: HTTP 500.
  test.fail();
  ...
});
```

Playwright reports these as _expected failures_ and the suite still exits 0. When the defect is
fixed the test starts passing and Playwright **fails the run** with "expected to fail but passed" —
an automatic signal that the fix landed.

Never call `test.fail()` at describe scope: it marks every following test in that block.

## Structure

- **One `test.describe()` per spec file**, prefixed by type: `"API: …"` or `"E2E: …"`.
- **Hooks live above the describe** — `beforeAll`, `beforeEach`, `afterAll`, `afterEach`, in that
  order, at most one of each.
- No `test.skip` — a missing prerequisite should fail, not vanish.
- No `waitForTimeout` — use auto-retrying `expect()` or a locator wait.
- No generic "regression" spec files; tests live in domain-specific files.
- Constants come from `tests/constants.js`. Never hard-code a path or an endpoint in a spec.

## Synchronisation

`waitForResponse` resolves when the HTTP response arrives, **not** when the UI has re-rendered.
Reading state straight after it yields stale values — this produced two false results while this
suite was being written, one of which passed vacuously against an empty table.

Synchronise on the rendered result instead: an auto-retrying `expect(locator).toContainText(...)`
in the spec, or a locator wait keyed to the expected content in the page object.

## Locators

Priority: `getByRole()` → `getByLabel()` → `getByText()` → `getByPlaceholder()` → `getByTestId()`.

In this application `getByLabel` does **not** work: the filter and sign-in labels carry no `for`
attribute and do not wrap their control. The usual remedy — fix the source — is unavailable, since
the application is deployed and this repository does not contain it. The app does emit
`data-testid` on all five filter selects, which is Playwright's default test id attribute, so no
`testIdAttribute` override is needed.

- No locators in spec files — all element access goes through `tests/e2e/pages/*.page.js`.
- POM locators are assigned in the constructor and referenced via `this.*`. Parameterised or
  one-off derived locators may stay inline in a method.
- No XPath, no complex CSS selectors.

## Authentication

The reference pattern — a `setup` project saving `storageState` once — cannot be used here. While
signed in, `localStorage`, `sessionStorage` and cookies are all empty: the token lives in memory
only, which is why a page reload signs the user out. A saved storage state would restore nothing,
so the `devicesPage` fixture signs in per test.

## Execution Model

`fullyParallel: false` and `workers: 1`. The environment is shared and mutable, and holds exactly
one device that is both online and outdated — the only target where the command's effect is
observable. The command spec runs `test.describe.configure({ mode: "serial" })` and resets the
dataset in `beforeEach`.
