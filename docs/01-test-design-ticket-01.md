# Test Design and Execution: Ticket #1 (Devices Filters)

**Environment:** https://qa-sample-lucas-forlin.up.railway.app  
**Credentials:** `qa.tester@example.com` / `Password123`  
**Viewport:** Desktop 1440x900  

Test cases are organized by acceptance criteria, followed by edge cases and usability findings identified during exploratory testing.

## Quality Criteria and Invariants

Beyond verifying that each filter selects the expected records, testing evaluated four core invariants to ensure data integrity and usability:

- **Self-consistency:** Every row returned by `filter = X` must display `X`.
- **Partition:** The sum of devices across all options of a filter must equal the total fleet count (100 devices).
- **Reachability:** Every distinct value displayed in a table column must be selectable in its corresponding filter dropdown.
- **Subset:** Combining filters (AND logic) must narrow or maintain the result count, never increase it.

### Fleet Baseline (100 devices, 15 per page, 7 pages total)

| Column        | Actual Fleet Data                                | Dropdown Options          | Reachability |
| :------------ | :----------------------------------------------- | :------------------------ | :----------: |
| Status        | online: 34, offline: 66                          | All, Online, Offline      |   100/100    |
| Core services | outdated: 60, up-to-date: 32, **unavailable: 8** | All, Outdated, Up to date |    92/100    |
| Orientation   | portrait: 62, landscape: 29, **square: 9**       | All, Portrait, Landscape  |    91/100    |
| Metadata      | 14 devices with metadata (4 keys)                | 4 fields, scoped values   |     N/A      |

---

## AC 1: "Each filter returns the correct devices on its own"

| #    | Case                                                | Steps                                                              | Expected                                    | Result                                                              |
| :--- | :-------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------ | :------------------------------------------------------------------ |
| 1.1  | Status = Online self-consistency                    | Select Online, paginate                                            | 34 devices, 3 pages, all rows "Online"      | ✅ Pass                                                             |
| 1.2  | Status = Offline self-consistency                   | Select Offline, paginate                                           | 66 devices, 5 pages, all rows "Offline"     | ✅ Pass                                                             |
| 1.3  | Status coverage                                     | Sum Online + Offline vs All                                        | 34 + 66 = 100 devices                       | ✅ Pass                                                             |
| 1.4  | Core services = Up to date self-consistency         | Select Up to date, paginate                                        | 32 devices, all rows "Up-To-Date"           | ✅ Pass                                                             |
| 1.5  | Core services = Outdated self-consistency           | Select Outdated, check Core services column                        | 60 devices, all rows "Outdated"             | ❌ Fail: returned 68 devices, including 8 with status "Unavailable" |
| 1.6  | Unavailable devices reachability                    | Check dropdown options for "Unavailable"                           | Option exists to filter unavailable devices | ❌ Fail: 8 devices exist in table, but cannot be filtered           |
| 1.7  | Orientation = Portrait / Landscape self-consistency | Select each, paginate                                              | 62 Portrait / 29 Landscape, all rows match  | ✅ Pass                                                             |
| 1.8  | Orientation coverage                                | Sum Portrait + Landscape vs All                                    | 62 + 29 = 100 devices                       | ❌ Fail: 62 + 29 = 91 devices (9 missing from options)              |
| 1.9  | Square orientation reachability                     | Look for "square" in table and check dropdown | Option exists to filter "square" devices    | ❌ Fail: 9 square devices exist, but no filter option exists        |
| 1.10 | Metadata Key + Value filter                         | Select `OffP POS Store Location` = `7`                             | 6 devices returned with this metadata pair  | ✅ Pass                                                             |
| 1.11 | Metadata empty value filter                         | Select `IMEI LTE Device` = `(empty)`                               | 8 devices carrying empty value              | ❌ Fail: returned 100 devices (filter was ignored)                  |
| 1.12 | Reset filter with "All"                             | Apply Online, then select All                                      | Restores 100 devices, 7 pages               | ✅ Pass                                                             |

---

## AC 2: "Filters combine correctly (AND) when more than one is applied"

| #   | Case                          | Steps                                                    | Expected                                               | Result                                                                      |
| :-- | :---------------------------- | :------------------------------------------------------- | :----------------------------------------------------- | :-------------------------------------------------------------------------- |
| 2.1 | Combine two filters           | Online + Portrait                                        | 19 devices, all matching both                          | ✅ Pass                                                                     |
| 2.2 | Combine three filters         | Online + Portrait + Up to date                           | 17 devices, all matching all three                     | ✅ Pass                                                                     |
| 2.3 | Subset invariant              | Compare case 2.1 against Online alone and Portrait alone | 19 <= 34 and 19 <= 62                                  | ✅ Pass                                                                     |
| 2.4 | Combination with Outdated     | Online + Portrait + Outdated                             | 1 device (only 1 device is online, portrait, outdated) | ❌ Fail: returned 2 devices; extra device has Core services = "Unavailable" |
| 2.5 | Metadata combined with status | Online + `OffP POS Store Location` = `7`                 | 0 devices (all 6 matching devices are offline)         | ✅ Pass (count is correct; see case 4.3 for UI empty state)                 |

---

## AC 3: "Metadata dropdowns list real, selectable options and apply once both are chosen"

| #   | Case                         | Steps                                       | Expected                                             | Result  |
| :-- | :--------------------------- | :------------------------------------------ | :--------------------------------------------------- | :------ |
| 3.1 | Field options match data     | Open Metadata field dropdown                | Lists the 4 existing keys, plus All                  | ✅ Pass |
| 3.2 | Values scoped to field       | Select each field and check values          | Values strictly match keys selected                  | ✅ Pass |
| 3.3 | Value dropdown dependency    | Inspect Value dropdown when Field = All     | Disabled until a Field is selected                   | ✅ Pass |
| 3.4 | Both selected applies filter | Covered by case 1.10                        | Table updates correctly                              | ✅ Pass |
| 3.5 | Changing Field resets Value  | Select Field A + Value 1, then change Field | Value resets to All, preventing invalid combinations | ✅ Pass |

**Note on AC 3:** Dropdown population and scoping work well. The only defect is case 1.11: selecting `(empty)` does not trigger any filter request, leaving all 100 devices displayed.

---

## Edge Cases and Unhandled Scenarios

These issues were identified during exploratory testing and impact overall user experience:

| #   | Case                                    | Steps                                               | Expected                                          | Result                                                                               |
| :-- | :-------------------------------------- | :-------------------------------------------------- | :------------------------------------------------ | :----------------------------------------------------------------------------------- |
| 4.1 | Filter change resets to page 1          | From page 3, apply `Store Location` = `1` (1 match) | Pagination resets to page 1                       | ❌ Fail: URL retains `page=3`, showing "Page 3 of 1 · 1 devices" with an empty table |
| 4.2 | Next button on last page                | Navigate to last page and inspect Next button       | Next button disabled                              | ❌ Fail: Next remains enabled indefinitely, allowing navigation to Page 15 of 7      |
| 4.3 | Empty state message                     | Filter with 0 results (case 2.5)                    | Friendly message indicating no devices match      | ❌ Fail: Blank table with no empty state indicator                                   |
| 4.4 | Footer counter accuracy                 | Apply Online + Portrait + `Store Location = 7`      | Footer matches formula `Page 1 of ceil(total/15)` | ✅ Pass (accurate when on page 1)                                                    |


---

## Summary for PM and DEV

| Criterion                     |   Status   | Technical Summary                                                                                                                                                                        |
| :---------------------------- | :--------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC 1 (Individual filters)** |  ❌ Fail   | 8 devices with `unavailable` and 9 with `square` cannot be filtered. Core services `outdated` incorrectly includes `unavailable` devices. Selecting `(empty)` metadata value is dropped. |
| **AC 2 (AND combination)**    | ⚠️ Partial | Boolean AND logic is correctly implemented, but inherits data leakage from the Core services defect (case 2.4).                                                                          |
| **AC 3 (Metadata dropdowns)** | ⚠️ Partial | Key and value scoping works as designed, except for `(empty)` value selection.                                                                                                           |

### Recommendations for Release

- **Dev Action Items:**
  1. Fix Core services query so `outdated` only returns outdated devices, excluding `unavailable` records.
  2. Add `unavailable` and `square` options to their respective dropdowns, or define fallback handling if those values are deprecated.
  3. Fix frontend state when selecting `(empty)` metadata value so it triggers the filter request.
  4. Reset pagination to `page = 1` whenever any filter changes.
  5. Disable the Next button when `currentPage >= totalPages`.
  6. Add an empty state component for 0-result queries.
- **PM Decision Needed:**
  - Confirm whether `unavailable` core services and `square` orientation are valid production states or legacy test artifacts. If valid, criteria must formally include them.
