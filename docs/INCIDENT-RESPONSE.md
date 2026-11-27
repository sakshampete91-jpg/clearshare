# Incident Response Plan — CLEARSHARE

## 1. Exposed Credential or Secret Alert Runbook

When GitHub Secret Scanning, CI regex scans, or an audit detects a credential pattern:

1. **Classify & Verify:** Determine the credential type, provider, commit SHA, and whether it is a **live credential** or a **synthetic test fixture**.
2. **If Genuine Live Credential (`CRITICAL`):**
   - **Revoke / Rotate Immediately** in the issuing provider console (e.g., Google Cloud Console, AWS IAM, GitHub PATs, OpenAI, Stripe) before code cleanup.
   - Remove the credential from current source files and replace with secure server-side Secret Manager / environment injection if truly needed.
   - Inspect provider audit/billing logs for unauthorized usage during the exposure window.
   - Notify the repository owner and assess whether authorized Git history rewrite (`git filter-repo`) + forced coordination is required.
3. **If Verified Synthetic Test Fixture (False Positive):**
   - Replace static token-shaped literals with runtime-assembled clearly labeled synthetic strings (`['AIza', 'Synthetic...'].join('')`) while keeping the security test passing.
   - Never disable GitHub Secret Scanning or CI scanners to hide alerts.
   - Document the finding commit and close the alert explicitly in GitHub Security UI as **Used in tests** / **False positive** after owner review.
   - *Reference case:* GitHub Secret Scanning Alert `#1` (`cf36e978`, `tests/detection.test.ts:99`) was verified as a synthetic test fixture, remediated in `HEAD`, and documented for manual owner closure.

## 2. Sensitive Document Data Exposure Runbook

Because CLEARSHARE keeps documents solely inside client browser memory, document exposure risks stem primarily from browser extensions, host compromise, accidental user export of unmasked residual signals, or an unintended code regression introducing remote calls/logging.

1. **Contain:** If a UI/parser regression introduces unintended storage (`localStorage`), debug logging (`console.log`), unsafe HTML rendering, or network transmission, immediately revert or patch the affected module and deploy an updated build.
2. **Preserve Evidence Without Extra PII:** Capture offending commit SHA, workflow logs, CSP violation metrics, or error codes — **never capture user document payloads or extracted PII into incident tickets or logs**.
3. **Verify Integrity:** Re-run `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, CodeQL, and CI boundary checks (`ci.yml`) before re-releasing.
4. **Notify & Document:** Inform affected users/owners if any non-local transfer actually occurred, publish a concise post-incident summary, and add regression tests in [verificationAndSecurity.test.ts](../frontend/tests/verificationAndSecurity.test.ts).
