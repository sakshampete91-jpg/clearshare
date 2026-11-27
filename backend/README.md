# Backend Architecture Note — Intentional Zero-Backend Design

CLEARSHARE intentionally has **no server-side API or backend document-processing service**.

## Why There Is No Backend

Privacy-sensitive documents should never need to leave the user's machine before inspection and sanitization:

- **Zero document upload:** Pasted text, `TXT`, `CSV`, `PDF`, `DOCX`, and `JSON` files are read and analyzed exclusively in browser memory (`FileReader` / `Uint8Array`, `pdfjs-dist`, `mammoth`, `papaparse`, and client-side Web Workers).
- **Zero persistence or telemetry:** No document text, detected entities, secrets, or pseudonym tables are sent to a remote API, stored in cookies, or persisted to `localStorage` / `sessionStorage`.
- **Static hosting ready:** In production, only static frontend build artifacts (`frontend/dist`) need to be served over HTTPS (see root [Dockerfile](../Dockerfile) and [nginx.conf](../nginx.conf)).

## Where Processing Runs Instead

All detection, exposure simulation, sanitization, independent re-verification, and non-PII report generation live inside [`frontend/src/`](../frontend/src):

| Responsibility | Client-Side Module |
|---|---|
| File extraction & validation | `frontend/src/engines/export/documentExtractor.ts` |
| Direct & secret pattern detection | `frontend/src/engines/detection/` |
| Context clues & exposure simulation | `frontend/src/engines/context/` & `frontend/src/engines/simulation/` |
| Configurable span sanitization | `frontend/src/services/sanitization/configuredSanitizer.ts` |
| Independent verification | `frontend/src/services/verification/verificationService.ts` |
| Non-PII report & export formatting | `frontend/src/services/reporting/` & `frontend/src/engines/export/` |
| Off-thread processing | `frontend/src/workers/documentProcessing.worker.ts` |

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [docs/SECURITY.md](../docs/SECURITY.md) for the complete pipeline and threat model.
