# Task 2 findings

---

**Subject: Sign-up / sign-in. Two fixes I'd want before tomorrow's release**

While testing the two tickets I explored the rest of the app, including the sign-in / sign-up flow. Two issues there are worth fixing before release; the rest can follow.

**Fix before release:**

- **E-mail is case-sensitive.** `Jane@…` registers as a _separate_ account from `jane@…`, and a
  user who signed up in lower case is refused when they type it capitalised, told the address
  doesn't exist. This is the priority: it's actively creating duplicate accounts and locking people
  out, and it gets more expensive every day it's live, since a later fix has to reconcile the
  duplicates that pile up in the meantime. The fix is to normalise e-mail (trim + lower-case) before
  lookup and before storing.

- **No password policy.** `a` is accepted, and so is whitespace. A minimum length and basic rules,
  enforced server-side — a small change, worth folding into the same release.

**Can follow, not blocking:**

- Sign-in reveals whether an address is registered — "email does not exist" vs "incorrect
  password". Worth tightening, low priority.

**My call.** The case-sensitivity fix should land before release, it's corrupting account data
now, and the cost only grows. The password rules are a quick win to include alongside it. All of it is written up as bug tickets.
