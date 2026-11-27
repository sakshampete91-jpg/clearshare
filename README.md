# CLEARSHARE

**Know what your data reveals before you share it.**

CLEARSHARE is a **client-side Privacy Intelligence and Document Exposure Analysis platform**. Rather than stopping after masking direct personal identifiers, CLEARSHARE simulates transformation strategies, runs an **independent verification scan** on the sanitized output, explains remaining linkability risks, and exports verified sanitized documents and non-PII privacy reports.

---

## Core Capabilities

1. **Workspace**
   - Editorial welcome & 4-stage workflow guide (`01 — Upload · 02 — Analyse · 03 — Protect · 04 — Verify`).
   - Paste text, drag-and-drop/upload **TXT, CSV, PDF, DOCX, or JSON** locally, or load three synthetic samples (**HR Resume**, **Medical Note**, **Customer Support Ticket**).
   - Live debounced processing with dedicated Web Worker offloading for larger documents.
   - Memory-only recent local session metadata.

2. **Document Analysis**
   - Detects **Emails**, **Indian Mobile Numbers**, **IPv4 Addresses (0–255)**, **Indian PAN Shapes**, **Aadhaar-like 12-Digit Candidates**, **Payment Cards (Luhn Validated)**, **API Keys & Secrets** (OpenAI `sk-`, AWS `AKIA`/`ASIA`, GitHub `ghp_`/`github_pat_`, Google `AIza`, Slack `xox*`, Stripe `sk_live_`/`rk_live_`, Bearer tokens, secret assignments), and **Custom Literal/Regex Rules** (ReDoS-guarded).
   - Honest 5-step progress indicator, searchable/filterable/sortable **Findings Table** with masked previews, and validation warnings.

3. **Privacy Simulator**
   - Explore **Full Masking**, **Partial Masking**, and **Consistent Pseudonymization** alongside configurable masking characters (`*`, `X`, `#`, `•`), trailing digits (`2`/`4`), email domain masking, date-year retention, and session pseudonym consistency.
   - Live **Privacy Risk Meter** (`Low` / `Moderate` / `High`), rule score breakdown, multi-clue linkability cards, and one-click clue recommendations.

4. **Compare & Review**
   - Synchronized side-by-side Original vs. Sanitized document view with category badges, transformation counts, and residual exposure explanations.

5. **Verification & Reporting**
   - Mandatory **Independent Output Verification** re-parses and re-scans transformed text and enforces honest statuses (`Not yet analysed`, `Processing`, `Exposure detected`, `Residual exposure detected`, `No supported patterns detected`, `Verification failed`).

6. **Export**
   - Verification-gated downloads for **Sanitized TXT**, **Formula-Safe Sanitized CSV** (with leading `=`, `+`, `-`, `@`, `\t`, `\r` neutralization and user notification), **Privacy Analysis Report (TXT / JSON)**, and **Copy Safe Text**.

---

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 11-stage processing pipeline and directory structure
- [SECURITY.md](./SECURITY.md) — Threat model, trust boundaries, XSS/CSV/ReDoS defenses, and limitations
- [TESTING.md](./TESTING.md) — Automated test suites, commands, and fixtures

---

## Local Development & Verification

```bash
# Install dependencies cleanly
npm ci

# Start local dev server
npm.cmd run dev -- --port 5173

# Lint (oxlint)
npm.cmd run lint

# TypeScript strict check
npm.cmd run typecheck

# Run automated test suite (Vitest)
npm.cmd run test:run

# Build production bundle
npm.cmd run build
```

---

## Static Deployment (Google Cloud Run)

CLEARSHARE ships as a static frontend via [Dockerfile](./Dockerfile) and [nginx.conf](./nginx.conf) with strict CSP (`frame-ancestors 'none'`), HSTS, `Permissions-Policy`, `Referrer-Policy`, and `X-Content-Type-Options` headers. No server ever receives document contents.

---

## Known Limitations

- Pattern and contextual matching cannot guarantee detection of arbitrary passwords, proprietary tokens, or unstructured prose PII.
- PAN, Aadhaar-like, and Luhn checks verify format/math only — never official government issuance or active card status.
- `"No supported patterns detected"` does not prove formal cryptographic or statistical anonymization.
