# CLEARSHARE

**Know what your data reveals before you share it.**

CLEARSHARE is a **client-side Privacy Intelligence & Exposure Simulation Platform**. Instead of stopping after masking direct personal identifiers, CLEARSHARE independently analyzes the *already sanitized* document to surface remaining indirect clues, explain potential linkability risks, and let users test additional redactions before sharing.

---

## Key Features

1. **Main Workspace**
   - Paste text directly, upload `.txt` or `.csv` files, or load three built-in synthetic datasets (*Customer Support Ticket*, *Software Bug Report*, *Recruitment Document CSV*).
   - Add optional custom sensitive phrases.
   - Choose between three sanitization modes (**Full Mask**, **Partial Mask**, **Consistent Pseudonymization**).

2. **Document Analysis Studio**
   - Detects six mandatory identifier categories with boundary-aware regular expressions and validators:
     - **Email addresses** (structural validation)
     - **Indian mobile numbers** (10-digit with optional `+91`/`91`, spaces, hyphens, parentheses; normalized for deduplication)
     - **IPv4 addresses** (strict `0–255` octet validation; rejects out-of-range strings)
     - **Indian PAN candidates** (structure & category letter check; explicitly states format check does not verify government issuance)
     - **Aadhaar-like 12-digit candidates** (boundary and formatting checks; explicitly not UIDAI-verified)
     - **Payment card candidates** (13–19 digits with **Luhn checksum** separation between valid and invalid checksums; explicitly not proof of active/genuine card)
   - Resolves overlapping matches deterministically and tracks exact character offsets.

3. **Privacy Exposure Simulator (Flagship Differentiator)**
   - Runs an **independent second scan** on the sanitized document.
   - Identifies any remaining direct identifiers and deterministic indirect contextual clues (person names, locations, specific dates, organizations, ticket/account references, repeated IDs, and `Uncertain` clues such as specific job titles).
   - Evaluates **potential linkability** (e.g., *Location + Specific Date*, *Unique Ticket Reference + Context*, *Person Name + Organization*).
   - Computes a transparent, rule-based exposure assessment (**Low**, **Moderate**, or **High Exposure**) with point breakdowns and an explicit disclaimer that it is not a statistical probability of re-identification.
   - Supports interactive clue recommendations and **re-simulation** with before-vs-after comparison.

4. **Comparison Studio**
   - Side-by-side Original vs. Sanitized document comparison with category-specific highlighting, synchronized scrolling, and live removed/remaining counts.

5. **Review & Safe Export + Local Activity Log**
   - Pre-export review checklist and final preview.
   - Downloads strictly the sanitized document as `.txt` or `.csv` (`PapaParse` cell-level sanitization with structural re-verification).
   - Never exports original text, pseudonym mappings, or internal logs.
   - Includes a non-PII Activity Log drawer and confirmed **Clear All Document Data**.

---

## Privacy & Security Architecture

- **100% Browser-Only Execution:** All detection, redaction, CSV parsing, and exposure simulation run locally in React/TypeScript memory.
- **Zero External Transmission:** No backend API, no Gemini/LLM document calls, no analytics, and locally bundled `@fontsource/inter` fonts.
- **No Persistent Document Storage:** No `localStorage`, `sessionStorage`, or `IndexedDB` is used for document contents or pseudonym tables.
- **Safe Rendering & CSP:** Document content is rendered as escaped React text nodes (no `dangerouslySetInnerHTML`), paired with a strict Content Security Policy in `index.html` and `nginx.conf`.

---

## Project Structure

```text
clearshare/
├── public/
├── src/
│   ├── app/AppContext.tsx
│   ├── components/
│   │   ├── analysis/HighlightedViewer.tsx
│   │   ├── layout/{ActivityLogDrawer,ConfirmDialog,TopNav}.tsx
│   │   └── simulator/{ExposureMeter,LinkabilityCard}.tsx
│   ├── data/syntheticSamples.ts
│   ├── engines/
│   │   ├── context/detectContextClues.ts
│   │   ├── detection/{detectEntities,patterns,validators}.ts
│   │   ├── export/{csvProcessor,exportFile}.ts
│   │   ├── redaction/sanitizeDocument.ts
│   │   └── simulation/runExposureSimulation.ts
│   ├── pages/{Workspace,AnalysisStudio,ExposureSimulator,ComparisonStudio,ReviewExport}.tsx
│   ├── styles/tokens.css
│   ├── types/clearshare.ts
│   └── utils/categoryMeta.ts
├── tests/{detection,redaction,simulation,csvProcessor,appFlow}.test.{ts,tsx}
├── Dockerfile
├── nginx.conf
└── package.json
```

---

## Local Setup & Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type-check TypeScript
npm run typecheck

# Run automated Vitest suite
npm run test:run

# Build production bundle
npm run build
```

---

## Static Deployment on Google Cloud Run

The `Dockerfile` builds the Vite bundle and serves static files via Nginx on port `8080` with zero server-side document handling.

```bash
# 1. Authenticate and set your Google Cloud project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable required services
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# 3. Build and deploy directly from source via Cloud Build
gcloud run deploy clearshare \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

---

## Hackathon Demo Flow

1. Open **Main Workspace** and click **Load** on *Customer Support Ticket*.
2. Click **Start Analysis** to inspect all detected emails, Indian phone numbers, PAN, Aadhaar-like IDs, IPv4s, and valid/invalid Luhn cards in **Document Analysis Studio**.
3. Click **Simulate Privacy Exposure** — notice that even when direct identifiers are `[REDACTED]`, **Pune + 12 October 2026 + TKT-48291 + FinEdge Payments** create linkable exposure (`High` / `Moderate`).
4. Check recommended contextual clues in the right panel and click **Apply Selected & Re-run Simulation** to watch the rule score drop transparently.
5. Open **Comparison Studio** to verify side-by-side highlights, then export the clean `.txt` or `.csv` in **Review & Export**.
