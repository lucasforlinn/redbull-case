# Test Design and Execution: Ticket #2 (Devices Command API)

**Endpoint:** `POST /api/devices/command`  
**Environment:** https://qa-sample-lucas-forlin.up.railway.app  
**Credentials:** `qa.tester@example.com` / `Password123`  
**Execution:** API only (HTTP client)  
**Data reset:** `POST /api/dev/reset` executed before and after test runs.

## Overview

This ticket implements `POST /api/devices/command` to allow internal backend services to dispatch commands directly to devices without browser interaction.

Testing evaluated the acceptance criteria, payload validation, error contracts, idempotency, concurrency, and authorization parity with other protected endpoints.

### Test Targets in Reset Dataset

| Role                 | `device_id`                 | Baseline State                                            |
| :------------------- | :-------------------------- | :-------------------------------------------------------- |
| Online + outdated    | `79101X02X002015003CAJ2000` | Only online device with `core_services_status = outdated` |
| Online + up-to-date  | `79101X02X002023000B3J2000` | Used for validation and baseline checks                   |
| Online + unavailable | `77C04248`                  | Device record has no `core_services_versions` object      |
| Offline              | `79101X02Q007950002F2J2002` | Used for AC 2 offline device checks                       |

_Note for reproduction:_ Out of 34 online devices, 32 are already `up-to-date`, 1 is `outdated`, and 1 is `unavailable`. The single outdated device is the only record where status progression can be directly validated.

---

## AC 1: "A valid request with only online devices returns a success response, and affected devices show updated status when re-fetched"

| #   | Case                               | Steps                                                            | Expected                                       | Result                                                             |
| :-- | :--------------------------------- | :--------------------------------------------------------------- | :--------------------------------------------- | :----------------------------------------------------------------- |
| 1.1 | Single online device               | Send valid payload with 1 online device                          | HTTP 200 with device in `updated` array        | ✅ Pass: `200 {"updated":["79101X02X002015003CAJ2000"]}`           |
| 1.2 | Status update verification         | Re-fetch via `GET /api/devices/:id`                              | `core_services_status` reflects new status     | ✅ Pass: changed from "outdated" to "up-to-date"                   |
| 1.3 | Batch of all online devices        | Send payload targeting all 34 online devices                     | HTTP 200 with all 34 devices listed            | ✅ Pass                                                            |
| 1.4 | Component versions progression     | Check `core_services_versions` on device record                  | Component versions move towards target version | ❌ Fail: all current version strings remain unchanged              |
| 1.5 | Audit trail on record              | Inspect device record after command                              | `updated_at` timestamp advances                | ❌ Fail: `updated_at` is not updated                               |
| 1.6 | Online device with no version data | Send command to device with `core_services_status = unavailable` | Sensible error or validation                   | ❌ Fail: device marked "up-to-date" despite having no version data |

---

## AC 2: "A request targeting a device that is not online is handled with a clear, appropriate error response"

| #   | Case                           | Steps                                       | Expected                                  | Result                                                                    |
| :-- | :----------------------------- | :------------------------------------------ | :---------------------------------------- | :------------------------------------------------------------------------ |
| 2.1 | Single offline device          | Send command targeting 1 offline device     | 4xx client error with descriptive message | ❌ Fail: returns HTTP 500 Internal Server Error                           |
| 2.2 | Error body security check      | Inspect 500 response payload                | Clean error message without stack trace   | ❌ Fail: body exposes server stack trace (`src/server/commands.ts:42:13`) |
| 2.3 | Mixed batch (online + offline) | Target 1 online device and 1 offline device | Handled with consistent validation error  | ❌ Fail: returns HTTP 500 with stack trace                                |
| 2.4 | Atomic execution check         | Check status of online device from case 2.3 | Online device remains unchanged           | ✅ Pass: status remained "outdated"; validation runs before writes        |

**Note on AC 2:** Targeting an offline device is an expected business case and must return a client validation error (HTTP 400 or 422). Returning HTTP 500 and exposing internal file paths is both a functional defect and a security vulnerability. On the positive side, atomic validation (case 2.4) works properly and avoids partial writes.

---

## AC 3: "Sending an unsupported command_name is rejected with a clear validation error"

| #   | Case                         | Steps                                     | Expected                 | Result                                              |
| :-- | :--------------------------- | :---------------------------------------- | :----------------------- | :-------------------------------------------------- |
| 3.1 | Unsupported command name     | Send `command_name: "reboot"`             | 4xx with clear message   | ✅ Pass: `400 {"error":"Unsupported command_name"}` |
| 3.2 | Missing command name         | Omit `command_name` field                 | 4xx with clear message   | ✅ Pass: `400 {"error":"Unsupported command_name"}` |
| 3.3 | Device state after rejection | Refetch device via `GET /api/devices/:id` | Status remains unchanged | ✅ Pass: no state mutation occurred                 |

---

## AC 4: "The request is rejected when Authorization is missing or invalid, consistent with other protected endpoints"

| #   | Case                         | Steps                                                           | Expected                           | Result                                            |
| :-- | :--------------------------- | :-------------------------------------------------------------- | :--------------------------------- | :------------------------------------------------ |
| 4.1 | Missing Authorization header | Request without `Authorization`                                 | HTTP 401 Unauthorized              | ✅ Pass: `401 {"error":"Unauthorized"}`           |
| 4.2 | Parity with other endpoints  | Compare with `/api/devices`, `/api/devices/:id`, `/api/assets`  | Identical status and response body | ✅ Pass: byte-for-byte identical on all endpoints |
| 4.3 | Forged JWT signature         | Request with invalid token signature                            | HTTP 401 Unauthorized              | ✅ Pass: identical 401 response                   |
| 4.4 | Malformed headers            | Send `Bearer` without token, token without `Bearer`, or `Basic` | HTTP 401 Unauthorized              | ✅ Pass in all cases                              |
| 4.5 | Expired JWT                  | Send valid token with expired timestamp                         | HTTP 401 Unauthorized              | ✅ Pass                                           |

**Note on AC 4:** Authentication handling is robust and fully consistent across all protected API routes.

---

## Contract Robustness and Edge Cases

These scenarios evaluate boundary conditions and input validation beyond the basic criteria:

| #    | Case                         | Steps                                  | Expected                           | Result                                                                                                                            |
| :--- | :--------------------------- | :------------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Empty devices array          | Send `devices: []`                     | 400 validation error               | ✅ Pass: `400 {"error":"devices must be a non-empty array of device_id strings"}`                                                 |
| 5.2  | Missing devices field        | Omit `devices` or pass string          | 400 validation error               | ✅ Pass                                                                                                                           |
| 5.3  | Duplicate IDs in batch       | Send `[id1, id1]` in `devices`         | Command applied once, deduplicated | ✅ Pass: single entry returned in `updated`                                                                                       |
| 5.4  | Unknown device_id            | Send non-existent device ID            | Explicit 404 or validation error   | ❌ Fail: returns `200 {"updated":[]}`                                                                                             |
| 5.5  | Numeric ID instead of string | Send numeric `id` (e.g. `1012028`)     | Explicit validation error          | ❌ Fail: returns `200 {"updated":[]}` (fails silently)                                                                            |
| 5.6  | Missing params object        | Omit `params` from payload             | 400 validation error               | ❌ Fail: returns HTTP 200 and updates device                                                                                      |
| 5.7  | Missing command_version      | Omit `command_version` or send `""`    | 400 validation error               | ❌ Fail: returns HTTP 200                                                                                                         |
| 5.8  | Non-existent target version  | Send `command_version: "99.99.99"`     | Rejected or validated              | ❌ Fail: returns HTTP 200                                                                                                         |
| 5.9  | Type mismatch in version     | Send `command_version: 6410` (number)  | 400 type error                     | ❌ Fail: returns HTTP 200                                                                                                         |
| 5.10 | Batch size limit             | Send large batch (e.g. 5000 IDs)       | Enforced limit or documentation    | ❌ Fail: accepts without restriction                                                                                              |
| 5.11 | Idempotency                  | Send identical command 3 times         | Consistent response, safe repeat   | ✅ Pass                                                                                                                           |
| 5.12 | Concurrency                  | 5 parallel commands to same device     | Consistent response, no corruption | ✅ Pass                                                                                                                           |
| 5.13 | Inconsistent batch handling  | Batch with 1 valid ID and 1 unknown ID | Consistent batch policy            | ❌ Fail: valid ID is updated, unknown ID is dropped with 200. Inconsistent with offline check where the entire batch is rejected. |

---

## Summary for PM and DEV

| Criterion                      |   Status   | Technical Summary                                                                       |
| :----------------------------- | :--------: | :-------------------------------------------------------------------------------------- |
| **AC 1 (Success & update)**    | ⚠️ Partial | Status flips to `up-to-date`, but component versions and `updated_at` are unchanged.    |
| **AC 2 (Offline handling)**    |  ❌ Fail   | Fails with HTTP 500 and exposes internal server stack trace.                            |
| **AC 3 (Unsupported command)** |  ✅ Pass   | Strict validation on `command_name`, clean 400 error.                                   |
| **AC 4 (Auth rejection)**      |  ✅ Pass   | Robust 401 handling across all token variations, fully aligned with existing endpoints. |

### Recommendations for Release

- **Dev Action Items:**
  1. Catch offline device checks and return a clean HTTP 400/422 response.
  2. Disable stack trace leakage in API error responses.
  3. Validate `params` and `command_version` (require non-empty semver string).
  4. Align invalid ID behavior: reject unknown and numeric IDs with clear validation rather than returning `200 {"updated":[]}`.
  5. Define a clear batch error strategy
  6. Return HTTP 405 for non-POST methods on `/api/devices/command`.
- **PM Decisions Needed:**
  1. Should command delivery advance component version numbers immediately, or does that depend on an asynchronous device acknowledgement?
  2. Should partial batch execution be supported (returning `{ updated: [...], failed: [...] }`), or should any invalid device reject the entire batch?
