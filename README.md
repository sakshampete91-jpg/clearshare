# CLEARSHARE

**Know what your data reveals before you share it.**

CLEARSHARE is a **client-side Privacy Intelligence & Exposure Simulation Platform**. Instead of stopping after masking direct personal identifiers, CLEARSHARE independently analyzes the *already sanitized* document to surface remaining indirect clues, explain potential linkability risks, and let users test additional redactions before sharing.

---

## Key Features

1. **Compact Live Two-Column Workspace**
   - Paste text directly, drag-and-drop/upload **TXT, CSV, PDF, DOCX, or JSON** documents (all parsed locally in browser memory via PDF.js, Mammoth.js, PapaParse, and native JSON), or load three discoverable synthetic chips (**HR Resume**, **Medical Note**, **Customer Support Ticket**).
   - Instant debounced analysis updates the sanitized output, **Redaction Summary** strip, and **Privacy Risk Meter** automatically as you edit or toggle settings.
   - Choose between three sanitization modes (**Full Mask**, **Partial Mask**, **Consistent Pseudonymization**) and toggle granular protection categories (**Emails**, **Phone Numbers**, **IP Addresses**, **PAN**, **Aadhaar-like**, **Cards**, **API Keys & Secrets**, **Names**, **Locations**, **Custom Phrases**).

2. **Hero Privacy Exposure Simulator**
   - Prominently positioned above the sanitized output panel.
   - Runs an **independent second scan** on the sanitized document to report exposure level (**Low**, **Moderate**, **High**), remaining direct identifiers, indirect contextual clues, **potential linkability** combinations, and one-click clue recommendations.
   - Expandable **Inspect Evidence** view reveals the rule-based score breakdown, all contextual clues, and linkability explanations without claiming statistical certainty or guaranteed anonymity.

3. **Expandable Comparison & Entity Validation**
   - Toggle **Expand Comparison** below the workspace for side-by-side Original vs. Sanitized highlighting, removed/remaining counts, and synchronized scrolling.
   - Switch to the **Detected Entities** tab inside the drawer to inspect exact character offsets, duplicate normalization counts, PAN/Aadhaar format disclaimers, Luhn checksum separation, and validation warnings.

4. **Safe Export & Local Activity Log**
   - Primary **Copy Safe Text** button, verified `.txt` / `.csv` downloads (`PapaParse` cell-level CSV sanitization with structural re-verification), and confirmed **Clear** workspace reset.
   - Compact header **Activity** drawer records application actions only — never document text or PII.

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
│   │   ├── comparison/ExpandableComparison.tsx
│   │   ├── layout/{ActivityLogDrawer,ConfirmDialog,InfoModal,TopNav}.tsx
│   │   └── simulator/{LinkabilityCard,PrivacyRiskMeter}.tsx
│   ├── data/syntheticSamples.ts
│   ├── engines/
│   │   ├── context/detectContextClues.ts
│   │   ├── detection/{detectEntities,patterns,validators}.ts
│   │   ├── export/{csvProcessor,exportFile}.ts
│   │   ├── redaction/sanitizeDocument.ts
│   │   └── simulation/runExposureSimulation.ts
│   ├── pages/Workspace.tsx
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

1. Open the live workspace and click the **Customer Support Ticket** sample chip above the input editor.
2. Notice the sanitized output and **Privacy Risk Meter** update automatically — direct PII is masked, yet **Pune + 12 October 2026 + TKT-48291** trigger linkability warnings.
3. Click **Apply** on the recommended clue or toggle **Names** / **Locations** in Protection Categories to see exposure drop in real time.
4. Click **Inspect Evidence** to examine rule-based point breakdowns and linkability cards, or click **Expand Comparison** for side-by-side diff highlights and entity validation notes.
5. Click **Copy Safe Text** (or download `.txt`/`.csv`) to share the sanitized output safely.
