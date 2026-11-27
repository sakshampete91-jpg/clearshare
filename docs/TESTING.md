# Testing Documentation — CLEARSHARE

## Commands

```bash
cd frontend

# Run full unit, integration, security, and UI test suite
npm run test:run

# Run TypeScript strict type-checking
npm run typecheck

# Run static lint checks (oxlint)
npm run lint

# Build production bundle
npm run build
```

## Test Suites

| File | Coverage |
|---|---|
| `frontend/tests/detection.test.ts` | Email, Indian phone (+91/91/formatting), IPv4 (0–255), PAN format, Aadhaar-like 12-digit, Luhn valid/invalid cards, API keys & secrets (OpenAI, AWS, GitHub, Google, Slack, Stripe, Bearer, assignments), false positives, contextual names/locations. |
| `frontend/tests/redaction.test.ts` | Full Mask, Partial Mask, Consistent Pseudonymization, repeated normalized entities, secret sanitization. |
| `frontend/tests/simulation.test.ts` | Post-redaction indirect clues, linkability combinations, interactive clue re-simulation. |
| `frontend/tests/csvProcessor.test.ts` | Quoted commas, escaped quotes, multiline cells, empty cells, CSV formula injection neutralization (`=`, `+`, `-`, `@`). |
| `frontend/tests/fileExtractors.test.ts` | TXT, CSV, JSON, DOCX (via `jszip` fixture), PDF (minimal valid PDF fixture), malformed/empty/oversized/unsupported file rejections. |
| `frontend/tests/verificationAndSecurity.test.ts` | Unicode & special characters, HTML/script injection checks, ReDoS regex guard, configurable masking characters & trailing digits, fail-closed verification, non-PII report integrity, 1,000-line stress test. |
| `frontend/tests/appFlow.test.tsx` | Full React UI workflow across all 6 screens, default Name/Location/Secret protection, masked diagnostics, Clear reset, script tag escaping, non-PII Activity Log. |

## Test Fixtures & Limitations

- All test data uses strictly **synthetic fictional examples** (no real PII or live credentials).
- In `jsdom` (Node test runner), `Worker` is unavailable, so `AppContext` exercises the synchronous pipeline fallback; Web Worker execution is verified in the Chromium browser preview against the Vite production build.
