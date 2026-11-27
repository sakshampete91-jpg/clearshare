# CLEARSHARE Architecture

## System Overview

CLEARSHARE is a **client-side Privacy Intelligence and Document Exposure Analysis platform**. Every stage—parsing, pattern detection, exposure simulation, span sanitization, independent verification, comparison, and export—runs strictly in browser memory with zero backend document processing.

## Processing Pipeline

```text
INPUT (Paste / File Upload / Synthetic Sample)
  ↓
VALIDATION (Extension, MIME, Magic Bytes, Size & Page Caps)
  ↓
PARSING (TXT / CSV PapaParse / PDF.js / Mammoth.js / JSON)
  ↓
DETECTION (Email, Phone, IPv4, PAN, Aadhaar-like, Luhn Card, API Keys, Custom Rules)
  ↓
EXPOSURE ANALYSIS (Direct vs Indirect Clues + Linkability Combinations)
  ↓
SIMULATION (Full Mask / Partial Mask / Consistent Pseudonymization + Config)
  ↓
SANITIZATION (Deterministic Non-Overlapping Span Replacement)
  ↓
RE-ANALYSIS & VERIFICATION (Independent Re-Parse + Re-Scan + Fail-Closed Status)
  ↓
COMPARISON (Synchronized Original vs Sanitized + Residual Risk Explanation)
  ↓
SAFE EXPORT (Sanitized TXT / Formula-Safe CSV / Non-PII Analysis Reports)
```

## Directory Structure

```text
src/
├── app/
│   └── AppContext.tsx                     # Session-only state, Web Worker dispatch, error recovery
├── components/
│   ├── analysis/HighlightedViewer.tsx     # Escaped React-node span highlighter
│   ├── comparison/ExpandableComparison.tsx# Synchronized side-by-side diff & entity view
│   ├── layout/
│   │   ├── ActivityLogDrawer.tsx          # Non-PII action log drawer
│   │   ├── ConfirmDialog.tsx              # Destructive reset confirmation
│   │   ├── InfoModal.tsx                  # Detection scope & privacy boundaries
│   │   ├── Sidebar.tsx                    # Responsive 248px editorial navigation sidebar
│   │   └── TopHeader.tsx                  # Context breadcrumb + Verification StatusPill
│   ├── simulator/
│   │   ├── LinkabilityCard.tsx            # Multi-clue linkability explanation card
│   │   └── PrivacyRiskMeter.tsx           # Rule-based Low/Moderate/High exposure meter
│   └── ui/                                # Badge, EmptyState, ErrorAlert, StatusPill
├── data/syntheticSamples.ts               # Fictional HR Resume, Medical Note, Support Ticket
├── engines/
│   ├── context/detectContextClues.ts      # Conservative heuristic clue detector
│   ├── detection/                         # Patterns, validators (Luhn, IPv4, PAN), overlap resolver
│   ├── export/                            # Document extractor (PDF/DOCX/CSV/JSON/TXT) & Blob download
│   ├── redaction/sanitizeDocument.ts      # Compatibility wrapper delegating to configuredSanitizer
│   └── simulation/runExposureSimulation.ts# Independent post-sanitization exposure scorer
├── features/
│   ├── document-analysis/FindingsTable.tsx# Masked findings table with search, filter, and sort
│   └── workspace/                         # UploadDropZone & OutputPanel
├── pages/                                 # 6 primary screens
│   ├── Workspace.tsx
│   ├── DocumentAnalysisPage.tsx
│   ├── PrivacySimulatorPage.tsx
│   ├── ComparisonReviewPage.tsx
│   ├── VerificationReportingPage.tsx
│   └── ExportReportingPage.tsx
├── security/inputGuards.ts                # Web Crypto IDs, ReDoS guard, CSV formula guard, error sanitization
├── services/
│   ├── pipeline/pipelineOrchestrator.ts   # Typed end-to-end pipeline contract
│   ├── reporting/reportService.ts         # Non-PII JSON/TXT privacy analysis reports
│   ├── sanitization/configuredSanitizer.ts# Authoritative configurable span sanitizer
│   └── verification/verificationService.ts# Mandatory independent output verifier
├── styles/tokens.css                      # Centralized Tailwind v4 @theme & CSS variables
├── types/clearshare.ts                    # Strict TypeScript interfaces
├── utils/categoryMeta.ts                  # Category badges & safe secret preview formatter
└── workers/documentProcessing.worker.ts   # Off-thread Web Worker for larger documents
```
