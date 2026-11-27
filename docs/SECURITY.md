# Security Policy & Threat Model — CLEARSHARE

## 1. Core Privacy Guarantee

CLEARSHARE processes all documents **exclusively inside the user's browser memory**.
- No document text, extracted PII, detected secrets, or pseudonym lookup tables are ever transmitted to a backend server, external AI API, or analytics platform.
- No document content is written to `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URLs.
- Static assets (including `Inter`, `Manrope`, and the `pdfjs-dist` worker) are bundled locally.

## 2. Threat Model & Trust Boundaries

| Asset | Threat | Implemented Control |
|---|---|---|
| Uploaded documents (`TXT`, `CSV`, `PDF`, `DOCX`, `JSON`) | Malicious markup / DOM XSS | All document content is rendered via React escaped text nodes. Zero `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, or `Function()`. |
| Uploaded binaries (`PDF`, `DOCX`) | Spoofed extensions, ZIP/resource exhaustion, encrypted files | Magic-byte header verification (`%PDF-`, `PK`), size caps (5 MB binary / 2 MB text), 50-page PDF limit, 500k-char cap, password/corruption error handling. |
| Custom regex rules | ReDoS (catastrophic backtracking) | `validateCustomRegexPattern` blocks patterns > 120 chars, nested quantifiers, and empty-matching patterns. |
| Exported CSV files | Spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) | `neutralizeCsvFormulaCell` prefixes leading formula characters with `'` and reports neutralized counts to the user. |
| Detected API keys & secrets | Accidental exposure in diagnostic UI or logs | `formatSafeEntityPreview` and `FindingsTable` mask secrets (`[SECRET ••••xxxx]`). Activity log and exported reports never contain raw values. |
| Exported filenames | Path traversal / local machine path disclosure | `sanitizeDisplayFilename` and `buildSafeExportFileName` strip directories and unsafe filename characters. |
| Session identifiers | Predictable `Math.random()` IDs | `generateSecureId` uses `crypto.randomUUID()` / `crypto.getRandomValues()`. |
| Static hosting / framing | Clickjacking, MIME sniffing, external script injection | `nginx.conf` enforces strict CSP (`default-src 'self'; frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and `Strict-Transport-Security`. |

## 3. Known Limitations

1. **Client Environment Boundary:** Browser-local processing cannot defend against a compromised operating system, malicious browser extensions with page-read permissions, or physical screen observation.
2. **Pattern Detection Boundaries:** Regular expressions and heuristics detect common formats (`sk-`, `AKIA`, `ghp_`, `AIza`, `xoxb-`, `sk_live_`, Bearer tokens, PAN/Aadhaar shapes, Luhn cards) and cannot guarantee detection of arbitrary passwords or proprietary formats.
3. **Anonymization Distinction:** Masking and session pseudonymization reduce exposure risk but **do not establish formal cryptographic or statistical anonymization**.

## 4. Responsible Disclosure

If you discover a security vulnerability in CLEARSHARE, please open a private security advisory or report it via the GitHub repository's Security tab rather than posting sensitive exploit payloads publicly.
