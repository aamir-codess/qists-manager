# Qists Manager — Testing & Findings Report

**Project:** Installment tracking app for small shops selling on monthly installments
**Live app:** https://qists-manager.lovable.app
**Tested by:** Aamir
**Method:** Manual functional and security testing, built with AI-assisted development (Lovable)

---

## Summary

This app was built using AI-assisted development, then manually tested across payment logic, data accuracy, and account security. Seven issues were found during testing — six were fixed and re-verified, one was confirmed as already working correctly.

---

## 1. Overpayment not applied to next installment

- **Found by:** Recording a payment larger than the amount due on an installment (paid 12,000 against a 10,000 due amount).
- **Issue:** The extra 2,000 was silently ignored — not applied anywhere, not tracked.
- **Risk:** Outstanding balances would slowly become inaccurate over time; no record of overpayment if a customer disputed it later.
- **Fix:** Updated payment logic so any amount paid beyond what's due on the selected installment rolls forward automatically into the next unpaid installment.
- **Verified:** Re-tested the same scenario — next installment correctly reduced from 10,000 to 8,000 owed.

## 2. Installment schedule showing outdated amounts

- **Found by:** After the overpayment fix, the Record Payment screen showed the corrected reduced amount, but the schedule list on the Customer Detail page still showed the original fixed amount.
- **Issue:** Two parts of the same page were reading different data — a display inconsistency, not a logic error.
- **Fix:** Updated the schedule list to pull the current, adjusted amount due for each installment instead of the original fixed value.
- **Verified:** Both the Record Payment view and the schedule list now show matching, correct amounts.

## 3. No indicator for total overpayment (credit balance)

- **Found by:** Testing a case where total payments across all installments exceeded the total sale amount.
- **Issue:** No indication anywhere that a customer had paid more than they owed overall — money effectively became invisible.
- **Fix:** Added a clear "Overpaid / Credit Balance" indicator on the Customer Detail page, showing the exact excess amount.
- **Verified:** Confirmed visually — a test customer correctly shows an overpaid credit balance after paying beyond their total owed.

## 4. Negative payment amounts

- **Found by:** Attempting to enter a negative number in the payment amount field.
- **Issue:** None — the app correctly rejected the input as invalid.
- **Status:** No fix needed. Confirmed working as expected.

## 5. No protection against repeated failed logins (brute-force)

- **Found by:** Deliberately entering the wrong password multiple times in a row.
- **Issue:** The app allowed unlimited password attempts with no delay or lockout, which would allow automated password-guessing.
- **Fix:** Added rate limiting — accounts are temporarily locked for 15 minutes after 5 failed login attempts, with failed attempts logged.
- **Verified:** Confirmed the account locks after 5 wrong attempts and shows a clear message explaining why.

## 6. IDOR — customer data accessible by editing the URL

- **Found by:** While logged in as one shop owner, manually replacing another customer's ID in the URL of the Customer Detail page.
- **Issue:** The page loaded the other shop owner's customer data directly, bypassing the account-level data separation (row-level security) that worked correctly on list views.
- **Risk:** A logged-in user could view another shop's customer records — including personal contact details — simply by guessing or copying IDs.
- **Fix:** Took two attempts. The first fix introduced an unintended side effect (broken routing, redirecting to an unrelated page instead of showing a proper error). A revised, more precise fix added a server-side ownership check without altering the page's routing structure.
- **Verified:** Re-tested on the published app — accessing another shop owner's customer ID now correctly redirects to the login page instead of showing any data.

## 7. Installment rounding accuracy

- **Found by:** Creating a sale where the total didn't divide evenly across months (100,000 over 6 months).
- **Issue:** None — tested to confirm the app handles rounding correctly.
- **Result:** Months 1–5 each showed 16,667; the final month showed 16,665, so all six installments summed to exactly 100,000 with no rounding drift.
- **Status:** No fix needed. Confirmed working as expected.

---

## Testing approach notes

- All testing was done using fake customer data — no real customer information was used at any stage.
- Two separate test shop-owner accounts were used to verify data isolation between accounts.
- Fixes were re-tested using the exact same steps that originally revealed the issue, not just checked for the absence of errors.
