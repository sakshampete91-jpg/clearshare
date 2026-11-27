import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  ShieldAlert,
  Table2,
  X,
} from 'lucide-react';
import { useApp, type AnalysisProgressStep } from '../app/AppContext';
import { ENTITY_CATEGORY_META } from '../utils/categoryMeta';
import type { DetectedEntity, EntityCategory } from '../types/clearshare';
import { HighlightedViewer } from '../components/analysis/HighlightedViewer';
import { FindingsTable } from '../features/document-analysis/FindingsTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { containsHtmlLikeMarkup } from '../security/inputGuards';

const ALL_CATEGORIES: EntityCategory[] = [
  'EMAIL',
  'PHONE',
  'IPV4',
  'PAN',
  'AADHAAR',
  'CARD',
  'API_KEY',
];

const PROGRESS_STEPS: AnalysisProgressStep[] = [
  'Validating input',
  'Parsing document',
  'Scanning supported patterns',
  'Analysing exposure',
  'Preparing findings',
];

export const DocumentAnalysisPage: React.FC = () => {
  const {
    rawText,
    documentSource,
    fileSizeBytes,
    hasAnalyzed,
    isProcessing,
    analysisStep,
    isCsvMode,
    csvGrid,
    detectedEntities,
    detectionWarnings,
    contextClues,
    enabledDirectCategories,
    customRules,
    addCustomRule,
    removeCustomRule,
    rerunAnalysisNow,
    clearAllData,
    setActiveScreen,
  } = useApp();

  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  const [patternInput, setPatternInput] = useState('');
  const [patternKind, setPatternKind] = useState<'literal' | 'regex'>('literal');
  const [patternError, setPatternError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const stats = useMemo(() => {
    const totals: Record<EntityCategory, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
      API_KEY: 0,
    };
    for (const ent of detectedEntities) {
      totals[ent.category] += 1;
    }
    return totals;
  }, [detectedEntities]);

  if (!rawText.trim() || !hasAnalyzed) {
    return (
      <EmptyState
        icon={SearchCheck}
        title="No Document Analysed Yet"
        description="Upload a TXT, CSV, PDF, DOCX, or JSON document, paste text, or load a synthetic sample in Workspace to view detected entities and validation notes."
        action={
          <button
            type="button"
            onClick={() => setActiveScreen('workspace')}
            className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Open Workspace</span>
          </button>
        }
      />
    );
  }

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomRule(patternInput, patternKind);
    if (!res.ok) {
      setPatternError(res.error ?? 'Invalid custom pattern.');
      return;
    }
    setPatternError(null);
    setPatternInput('');
  };

  const hasMarkupWarning = containsHtmlLikeMarkup(rawText);
  const activeStepIdx =
    analysisStep === 'Complete'
      ? PROGRESS_STEPS.length
      : PROGRESS_STEPS.indexOf(analysisStep);

  return (
    <div className="space-y-4">
      {/* Header + File Metadata + Controls */}
      <section className="cs-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg font-bold text-ink">Document Analysis</h1>
            <p className="mt-0.5 text-xs text-muted">
              Understand what sensitive information your document may reveal. Rule-based pattern
              detection only — format checks do not confirm government or issuer validity.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="rounded-md bg-cream px-2 py-0.5 font-medium text-ink">
                File: {documentSource.fileName ?? 'Pasted text'}
              </span>
              <span className="rounded-md bg-cream px-2 py-0.5">
                Type: {documentSource.kind.toUpperCase()}
              </span>
              {fileSizeBytes !== null && (
                <span className="rounded-md bg-cream px-2 py-0.5">
                  Size: {(fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              )}
              <span className="rounded-md bg-sage/60 px-2 py-0.5 font-semibold text-forest-hover">
                {detectedEntities.length} direct · {contextClues.length} contextual clues
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={rerunAnalysisNow}
              disabled={isProcessing}
              className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-warm-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Re-analyse</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreen('workspace')}
              className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-warm-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-cream"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Change Document</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#DFB3AC] bg-surface px-3 py-1.5 text-xs font-semibold text-[#732820] hover:bg-status-error/45"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreen('simulator')}
              className="cs-focus-ring-purple inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-royal px-3.5 py-1.5 text-xs font-semibold text-surface hover:bg-royal-hover"
            >
              <span>Privacy Simulator</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Honest 5-Step Progress Indicator */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 border-t border-warm-border pt-3 sm:grid-cols-5">
          {PROGRESS_STEPS.map((step, idx) => {
            const done = analysisStep === 'Complete' || idx < activeStepIdx;
            const active = isProcessing && idx === activeStepIdx;
            return (
              <div
                key={step}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                  done
                    ? 'border-[#B6D4BA] bg-sage/45 text-forest-hover'
                    : active
                      ? 'border-[#C6B2DE] bg-lavender text-royal-hover'
                      : 'border-warm-border bg-cream/40 text-muted'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {idx + 1}. {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Category Summary Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {ALL_CATEGORIES.map((cat) => {
            const meta = ENTITY_CATEGORY_META[cat];
            return (
              <div
                key={cat}
                className="rounded-xl border border-warm-border bg-cream/45 px-3 py-2"
              >
                <div className="text-[11px] font-medium text-muted">{meta.shortLabel}</div>
                <div className="text-lg font-bold text-ink">{stats[cat]}</div>
              </div>
            );
          })}
        </div>
      </section>

      {hasMarkupWarning && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E2C28E] bg-status-warning/60 px-4 py-2.5 text-xs text-[#664212]">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            HTML or script-like tags were detected in the input. CLEARSHARE renders all document
            content as escaped plain text nodes — uploaded content is never executed.
          </span>
        </div>
      )}

      {detectionWarnings.length > 0 && (
        <section className="rounded-xl border border-[#E2C28E] bg-status-warning/50 p-4 text-xs text-[#664212]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Validation & False-Positive Notes ({detectionWarnings.length})</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {detectionWarnings.map((w) => (
              <li key={w.id}>
                • <strong>{ENTITY_CATEGORY_META[w.category].shortLabel}</strong> (chars {w.start}–
                {w.end}): {w.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Findings Table (Masked Previews + Category/Severity/Search/Sort) */}
      <section className="cs-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">
            Findings Table (Masked Previews)
          </h2>
          <span className="text-[11px] text-muted">
            Raw credentials and full sensitive values are masked in this table by default.
          </span>
        </div>

        <FindingsTable
          entities={detectedEntities}
          enabledDirectCategories={enabledDirectCategories}
          selectedEntityId={selectedEntity?.id}
          onSelectEntity={setSelectedEntity}
        />
      </section>

      {/* Custom Patterns + Document Highlight View */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="cs-card p-4 lg:col-span-5">
          <h2 className="text-sm font-bold text-ink">
            Custom Detection Patterns (Literal & Validated Regex)
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Add internal project codes or custom regex rules (ReDoS-protected).
          </p>

          <form onSubmit={handleAddRule} className="mt-3 flex flex-wrap items-center gap-2">
            <select
              aria-label="Pattern type"
              value={patternKind}
              onChange={(e) => setPatternKind(e.target.value as 'literal' | 'regex')}
              className="cs-focus-ring min-h-[34px] rounded-lg border border-warm-border bg-surface px-2.5 text-xs text-ink"
            >
              <option value="literal">Exact Phrase</option>
              <option value="regex">Regex Pattern</option>
            </select>
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              placeholder={
                patternKind === 'regex' ? 'e.g. EMP-[0-9]{4,6}' : 'e.g. Project Falcon'
              }
              aria-label="Custom detection pattern"
              className="cs-focus-ring min-h-[34px] min-w-[160px] flex-1 rounded-lg border border-warm-border bg-surface px-3 text-xs text-ink"
            />
            <button
              type="submit"
              className="cs-focus-ring inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-forest px-3 text-xs font-semibold text-surface hover:bg-forest-hover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Rule</span>
            </button>
          </form>
          {patternError && <p className="mt-1.5 text-xs text-[#732820]">{patternError}</p>}

          {customRules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {customRules.map((rule) => (
                <span
                  key={rule.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C6B2DE] bg-lavender px-2.5 py-0.5 text-[11px] font-medium text-royal-hover"
                >
                  <span className="uppercase opacity-75">{rule.kind}:</span>
                  <span className="font-mono">{rule.pattern}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomRule(rule.id)}
                    aria-label={`Remove pattern ${rule.pattern}`}
                    className="rounded-full p-0.5 hover:bg-royal/10"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="cs-card p-4 lg:col-span-7">
          <h2 className="mb-2.5 text-sm font-bold text-ink">
            {isCsvMode ? 'CSV Cell Highlight View' : 'Document Highlight View'}
          </h2>
          {isCsvMode && csvGrid ? (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-warm-border">
              <div className="flex items-center gap-2 border-b border-warm-border bg-cream px-3 py-2 text-xs font-medium text-ink">
                <Table2 className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                <span>
                  {csvGrid.headers.length} columns · {csvGrid.rows.length} rows
                </span>
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-cream/65">
                    <th className="border-b border-warm-border px-2.5 py-1.5 text-muted">Row</th>
                    {csvGrid.headers.map((h, i) => (
                      <th key={i} className="border-b border-warm-border px-2.5 py-1.5 text-ink">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvGrid.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-warm-border last:border-0">
                      <td className="px-2.5 py-1.5 font-mono text-muted">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => {
                        const cellEnts = detectedEntities.filter(
                          (e) => e.rowIndex === rIdx + 1 && e.colIndex === cIdx
                        );
                        return (
                          <td key={cIdx} className="max-w-[200px] px-2.5 py-1.5 align-top">
                            {cellEnts.length > 0 ? (
                              <HighlightedViewer
                                text={cell}
                                entities={cellEnts}
                                selectedEntityId={selectedEntity?.id}
                                onSelectEntity={setSelectedEntity}
                              />
                            ) : (
                              <span className="whitespace-pre-wrap text-ink">{cell}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              <HighlightedViewer
                text={rawText}
                entities={detectedEntities}
                selectedEntityId={selectedEntity?.id}
                onSelectEntity={setSelectedEntity}
              />
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset analysis and clear document?"
        message="This will remove the document text, findings, verification report, and in-memory pseudonym mappings."
        confirmLabel="Reset Workspace"
        onConfirm={() => {
          setConfirmResetOpen(false);
          clearAllData();
          setActiveScreen('workspace');
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};
