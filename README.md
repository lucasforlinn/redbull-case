# Red Bull QA Case Study: Digital Poster Dashboard

QA pass on two tickets handed over for testing, plus the automated coverage that keeps the
findings from regressing.

- **Ticket #1:** Devices page filters (status, core services, orientation, device metadata)
- **Ticket #2:** `POST /api/devices/command`, a backend-to-backend endpoint

Application under test: <https://qa-sample-lucas-forlin.up.railway.app>

## What is here

|                                                                        |                                                        |
| :--------------------------------------------------------------------- | :----------------------------------------------------- |
| [`docs/01-test-design-ticket-01.md`](docs/01-test-design-ticket-01.md) | Manual test design and results: filters (24 cases)     |
| [`docs/02-test-design-ticket-02.md`](docs/02-test-design-ticket-02.md) | Manual test design and results: command API (31 cases) |
| [`docs/03-message-to-pm-and-dev.md`](docs/03-message-to-pm-and-dev.md) | Communication to PM and Dev: Task 2 and auth findings  |
| `tests/`                                                               | Playwright suite: 6 automated tests                    |

## Running

```bash
npm ci
npx playwright install --with-deps chromium
cp .env.example .env

npm test              # everything     → 6 passed (4 passed, 2 expected failures)
npm run test:api      # API only       → 4 passed (3 passed, 1 expected failure)
npm run test:e2e      # E2E only       → 2 passed (1 passed, 1 expected failure)
npm run test:report   # open the HTML report
npx playwright test --ui  # open interactive UI mode
```

`.env.example` holds the demo credentials. They are printed on the application's own sign-in
screen and the environment contains no real data.

## Automated Test Suite (6 tests)

### API: Ticket #2 (`POST /api/devices/command`)

- **AC 1 (Valid request with online devices):** Sends a valid command to an online, outdated device. Asserts HTTP 200, device included in `updated` array, and verifies `core_services_status` updates via `GET /api/devices/:id`.
- **AC 2 (Offline device handling - Expected Fail):** Asserts an offline device returns a client error (4xx) without leaking internal stack traces. _(Fails as HTTP 500 with stack trace)._
- **AC 3 (Unsupported command_name):** Sends an unsupported command (`reboot`). Asserts HTTP 400 validation error and verifies device remains unchanged.
- **AC 4 (Authorization rejection and consistency):** Asserts missing token and forged signatures return HTTP 401, matching the exact rejection status and body of other protected endpoints (`GET /api/devices`).

### E2E: Ticket #1 (Devices Filters)

- **Filter combination and device validation:** Applies filters for **Online**, **Up to date**, and **Landscape**. Asserts pagination displays exactly 8 matching devices on 1 page, and verifies each displayed row in the table matches all three filter criteria.

### E2E: Authentication (Exploratory finding from Task 2)

- **Case-insensitive email sign-in (Expected Fail):** Discovered during the exploratory testing of Task 2. Registers with lowercase email, signs out, and attempts sign-in with uppercase. _(Fails as the backend is case-sensitive on email lookup)._

---

## Two tests fail on purpose (and the suite is still green)

Assertions are written against **correct** behaviour, never against the current behaviour. Tests
covering a confirmed defect are marked `test.fail()`, so Playwright reports them as _expected
failures_ and the run exits 0.

The payoff is what happens after a fix: the test starts passing, and Playwright **breaks the
build** with "expected to fail but passed". The suite is an executable specification that
announces its own repairs.

| Test                                                  | Spec                                             | Filed as                                                                                                                                            | What it asserts                                                                                                    |
| :---------------------------------------------------- | :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| A command on an offline device is rejected with a 4xx | `tests/api/specs/devices-command.spec.js` (AC 2) | [#18](https://github.com/pshaddel/qa-case-study-lucas-forlinn/issues/18) & [#19](https://github.com/pshaddel/qa-case-study-lucas-forlinn/issues/19) | Returns `500` with internal stack trace instead of a handled 4xx                                                   |
| Registered user can sign in regardless of e-mail case | `tests/e2e/specs/auth.spec.js`                   | [#22](https://github.com/pshaddel/qa-case-study-lucas-forlinn/issues/22)                                                                            | Discovered during Task 2 exploration: sign-in is case-sensitive and rejects registered users with different casing |

Both confirmed defects are tracked as issues on GitHub. The tests assert correct specification behaviour and will fail once the fixes land, alerting the team that the defects have been resolved.

## How this was tested

The testing process followed a structured, multi-phase approach:

1. **Test Planning and Manual Testing:** Comprehensive test designs were created first based on ticket specifications (`docs/01-test-design-ticket-01.md` and `docs/02-test-design-ticket-02.md`). Manual exploratory testing was performed across the UI and API to validate core acceptance criteria and establish exact data baselines.
2. **AI Agent Exploration with `playwright-cli`:** An AI agent utilizing `playwright-cli` was then used to investigate deeper edge cases and complex scenarios. This included instrumenting `window.fetch` to detect UI race conditions during rapid filter changes, evaluating session behavior on page reloads, and testing unhandled data boundaries.
3. **Data Invariants and Automated Coverage:** API fleet data was profiled directly to derive test assertions from system invariants rather than hardcoded fixture counts. Automated Playwright tests were then implemented to ensure continuous regression coverage for both tickets.

Page objects follow strict Playwright locator practices, prioritizing `data-testid` attributes on inputs and select controls, and using role-based locators for buttons and tables.

Conventions, and the places where this repository deliberately departs from the reference Playwright structure, are documented in [`CLAUDE.md`](CLAUDE.md).
