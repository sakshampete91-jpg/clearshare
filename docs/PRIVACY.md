# Privacy Architecture & Data-Flow Specification — CLEARSHARE

## 1. Local-First Core Guarantee

CLEARSHARE processes all user documents **exclusively inside the user's browser memory**:

- **Zero backend servers** receive uploaded documents, extracted text, detected entities, secrets, sanitized text, or pseudonym maps (see [`backend/README.md`](../backend/README.md)).
- **Zero browser persistence:** `localStorage`, `sessionStorage`, `IndexedDB`, cookies, and query URLs are never used to store document content or user identifiers.
- **Zero external analytics or AI APIs:** Fonts (`@fontsource/inter`, `@fontsource/manrope`) and the PDF worker (`pdfjs-dist`) are bundled locally in the Vite build.

## 2. Complete Data-Flow Map

| Flow | Data Type | Source | Destination | Purpose | Transmission Needed? | Access Scope | Retention & Deletion | Controls & Residual Risk |
|---|---|---|---|---|---|---|---|---|
| **1. Text / File Input** | Level 4 (Document text / bytes) | User paste, local file upload (`TXT`/`CSV`/`PDF`/`DOCX`/`JSON`), or synthetic sample | React state (`AppContext`) & temporary `ArrayBuffer` | Parse & analyze document locally | **No remote transfer** | Current browser tab only | Dropped on `Clear`, file removal, or tab close | Magic bytes, extension/MIME checks, size/page/char caps; risk: local compromised extension |
| **2. Off-Thread Analysis** | Level 4 & Level 5 (Text, custom rules) | Main thread (`AppContext`) for docs ≥ 8,000 chars | Same-origin Dedicated Web Worker (`documentProcessing.worker.ts`) | Prevent UI freeze during scanning & simulation | **No remote transfer** (in-browser message channel) | Current tab + worker thread | Terminated on `Clear`, replacement, or unmount | `event.origin` & payload check; risk: JS GC timing |
| **3. Diagnostics & Preview** | Level 4 & masked Level 5 | Detection & context engines | React UI (`FindingsTable`, `HighlightedViewer`, `Comparison`) | Show user detected risk & previews | **No remote transfer** | Current browser tab | Dropped on `Clear` or tab close | Secret previews masked (`[SECRET ••••xxxx]`), React escaped text nodes only |
| **4. Session Operational Log** | Level 2 (Action name, timestamp, aggregate counts, sanitized filename) | User actions & pipeline completion | `activityLog` & `localSessions` in React state | Show non-PII audit trail in UI | **No remote transfer** | Current browser tab | Cleared completely by `Clear` (`clearAllData`) or tab close | Never records document text, detected values, or raw secrets |
| **5. Safe Exports** | Sanitized TXT / CSV or Level 2 non-PII JSON/TXT report | Verified `redactionResult` / `buildPrivacyAnalysisReport` | User-initiated browser `Blob` download (`downloadSanitizedFile`) or Clipboard API | Save sanitized output locally | **No remote transfer** | User local filesystem / clipboard | Revoked `ObjectURL` (`1000ms` timeout); user controls downloaded files | Verification gate blocks export on failure; CSV formulas neutralized; clipboard persists until user replaces it |

## 3. Data Retention & Erasure Policy

- **Default Retention:** `0` server-side retention (no backend database exists). Ephemeral client state exists only in JavaScript memory during the active tab session.
- **User-Initiated Erasure:** Clicking **Clear** or **Start new analysis** invokes `clearAllData()` in [AppContext.tsx](../frontend/src/app/AppContext.tsx), which terminates any active Web Worker and resets `rawText`, `documentSource`, `csvGrid`, `customRules`, `additionalRedactions`, `detectedEntities`, `contextClues`, `redactionResult`, `simulationResult`, `simulationHistory`, `localSessions`, `verificationReport`, and `activityLog`.
- **Browser Tab Closure:** All JavaScript heap state and in-memory `InMemoryPseudonymRegistry` tables are released when the tab closes.
