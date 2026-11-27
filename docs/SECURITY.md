# Security Policy & Architecture Controls — CLEARSHARE

## 1. Data Classification Model

| Level | Category | Examples in CLEARSHARE | Storage & Transmission Policy |
|---|---|---|---|
| **LEVEL 1 — Public** | Public static UI assets & docs | Bundled fonts (`Inter`, `Manrope`), `favicon.svg`, `README.md`, `docs/` | Served as static build output; cached cleanly (`public, immutable` for hashed assets). |
| **LEVEL 2 — Internal** | Operational metadata & CI configs | Verification status, entity counts by category, timestamps, non-PII `ActivityLogEntry` | Session memory only; aggregate analysis reports exclude all raw document content. |
| **LEVEL 3 — Personal** | User accounts / profiles | **None** — CLEARSHARE intentionally operates without user accounts or sign-in | N/A in current release. |
| **LEVEL 4 — Sensitive Document Data** | Document inputs, extracted PII, clues, exports | Pasted text, `TXT`/`CSV`/`PDF`/`DOCX`/`JSON`, Emails, Phones, IPv4, PAN, Aadhaar-like IDs, Cards, Names, Locations | **Browser memory only.** Never sent to any server, cookie, `localStorage`, `sessionStorage`, `IndexedDB`, or URL. |
| **LEVEL 5 — Secret Credentials** | API keys & tokens inside documents or repo | Detected `sk-`, `AKIA`, `ghp_`, `AIza`, `xoxb-`, `sk_live_`, Bearer tokens, secret assignments | Masked in diagnostics (`[SECRET ••••xxxx]`) and sanitized before export. **Zero live credentials in repo.** |

## 2. Implemented Security Controls vs. Deployment Scope

| Control | Implementation | Status |
|---|---|---|
| Local-only document processing | Pure TypeScript pipeline + Dedicated Web Worker in `frontend/src/` | **Implemented & CI-verified** |
| XSS & DOM injection protection | React escaped text nodes only; zero `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `Function` | **Implemented & Tested** |
| Document upload & resource limits | Extension + magic-byte checks (`%PDF-`, `PK`), 2 MB text / 5 MB binary, 50 PDF pages, 500k char cap | **Implemented & Tested** |
| PDF parser hardening | `pdfjsLib.getDocument({ data, useSystemFonts: false, useWorkerFetch: false })` | **Implemented** |
| Custom regex ReDoS protection | `validateCustomRegexPattern` rejects >120 chars, nested quantifiers, empty matches | **Implemented & Tested** |
| Web Worker origin & payload validation | `event.origin` check (`''` or `self.location.origin`) & schema check in `documentProcessing.worker.ts` & `AppContext.tsx` | **Implemented** |
| CSV formula-injection protection | `neutralizeCsvFormulaCell` prefixes leading `=`, `+`, `-`, `@`, `\t`, `\r` with `'` | **Implemented & Tested** |
| Safe error & filename handling | `buildSafeAppError` redacts accidental email/token patterns & normalizes whitespace; `sanitizeDisplayFilename` strips directories | **Implemented & Tested** |
| CSP & browser isolation headers | Meta CSP in `frontend/index.html`; full Nginx headers (`COOP`, `CORP`, `HSTS`, `XFO: DENY`, `CSP`, `server_tokens off`) in `nginx.conf` | **Configured (Meta Active in Dev; HTTP Headers Active in Nginx/Docker Deployment)** |
| CI DevSecOps & security gates | `ci.yml` (`oxlint`, `tsc`, `vitest`, `vite build`, `npm audit`, secret regex & privacy boundary grep), `codeql.yml`, `dependency-review.yml` | **Implemented & Active on GitHub Actions** |

## 3. Content Security Policy Note

`frontend/index.html` and `nginx.conf` enforce `script-src 'self'`, `object-src 'none'`, `connect-src 'self'`, and `form-action 'none'` (zero `'unsafe-eval'`). `style-src 'self' 'unsafe-inline'` is retained specifically for dynamic React inline width/style attributes (such as exposure progress indicators); no user-controlled HTML or JavaScript is ever evaluated.

## 4. Known Limitations

1. **Client Environment Boundary:** Browser-local processing cannot protect against a compromised OS, malicious browser extensions with page-read access, or shoulder surfing.
2. **JavaScript Memory Lifetime:** Clicking `Clear` / `Start new analysis` drops all React references, terminates active Workers, and clears `localSessions`, but JavaScript runtimes cannot guarantee immediate physical RAM zeroing prior to garbage collection.
3. **Rule-Based Detection Scope:** Regex, checksum, and contextual heuristics reduce disclosure risk and **do not establish formal cryptographic or statistical anonymization**.

## 5. Responsible Disclosure

Report security issues privately via the GitHub repository's **Security** tab rather than posting sensitive payloads in public issues.
