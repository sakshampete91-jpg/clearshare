import React, { useMemo, useRef, useState } from 'react';
import {
  FileText,
  History,
  Plus,
  Stethoscope,
  Ticket,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { SYNTHETIC_SAMPLES } from '../data/syntheticSamples';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import type {
  ContextClueCategory,
  EntityCategory,
  SanitizationMode,
} from '../types/clearshare';
import { UploadDropZone } from '../features/workspace/UploadDropZone';
import { OutputPanel } from '../features/workspace/OutputPanel';
import { ExpandableComparison } from '../components/comparison/ExpandableComparison';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';

const DIRECT_CATEGORY_ITEMS: { key: EntityCategory; label: string }[] = [
  { key: 'EMAIL', label: 'Emails' },
  { key: 'PHONE', label: 'Phone Numbers' },
  { key: 'IPV4', label: 'IP Addresses' },
  { key: 'PAN', label: 'PAN' },
  { key: 'AADHAAR', label: 'Aadhaar-like' },
  { key: 'CARD', label: 'Cards' },
  { key: 'API_KEY', label: 'API Keys & Secrets' },
];

const CONTEXT_CATEGORY_ITEMS: { key: ContextClueCategory; label: string }[] = [
  { key: 'PERSON_NAME', label: 'Names' },
  { key: 'LOCATION', label: 'Locations' },
  { key: 'CUSTOM_PHRASE', label: 'Custom Phrases' },
];

const SAMPLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'hr-resume': UserCheck,
  'medical-note': Stethoscope,
  'support-ticket': Ticket,
};

const WORKFLOW_STEPS = [
  { num: '01', title: 'Upload', desc: 'Paste or load TXT, CSV, PDF, DOCX, JSON locally' },
  { num: '02', title: 'Analyse', desc: 'Detect PII, credentials, and contextual clues' },
  { num: '03', title: 'Protect', desc: 'Mask, partially mask, or pseudonymize values' },
  { num: '04', title: 'Verify', desc: 'Re-scan output for residual exposure before sharing' },
];

export const Workspace: React.FC = () => {
  const {
    rawText,
    setRawText,
    documentSource,
    sanitizationMode,
    setSanitizationMode,
    enabledDirectCategories,
    toggleDirectCategory,
    enabledContextCategories,
    toggleContextCategory,
    customRules,
    addCustomRule,
    removeCustomRule,
    hasAnalyzed,
    detectedEntities,
    contextClues,
    redactionResult,
    verificationStatus,
    localSessions,
    loadSample,
    clearAllData,
    setDocumentInputMeta,
  } = useApp();

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const detectedCounts = useMemo(() => {
    const direct: Record<EntityCategory, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
      API_KEY: 0,
    };
    for (const ent of detectedEntities) {
      direct[ent.category] += 1;
    }

    const context: Record<string, number> = {
      PERSON_NAME: 0,
      LOCATION: 0,
      CUSTOM_PHRASE: 0,
    };
    for (const clue of contextClues) {
      if (clue.category in context) {
        context[clue.category] += 1;
      }
    }
    return { direct, context };
  }, [detectedEntities, contextClues]);

  const handleAddPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomRule(phraseInput, 'literal');
    if (!res.ok) {
      setRuleError(res.error ?? 'Invalid custom phrase.');
      return;
    }
    setRuleError(null);
    setPhraseInput('');
  };

  const executeClear = () => {
    setComparisonOpen(false);
    setPhraseInput('');
    setRuleError(null);
    clearAllData();
  };

  const handleStartNewAnalysis = () => {
    if (rawText.trim()) {
      setConfirmResetOpen(true);
    } else {
      editorRef.current?.focus();
    }
  };

  const charCount = rawText.length;
  const lineCount = rawText ? rawText.split(/\r?\n/).length : 0;
  const canClear = Boolean(rawText.trim() || customRules.length > 0);
  const hasOutput = Boolean(
    hasAnalyzed && redactionResult?.sanitizedText && verificationStatus !== 'Verification failed'
  );

  return (
    <div className="space-y-4">
      {/* Editorial Welcome & Workflow Strip */}
      <section className="cs-card px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-ink">
              Your documents. Your privacy. Your control.
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              Discover sensitive information, understand potential exposure and prepare documents
              for safer sharing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartNewAnalysis}
            className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <span>Start new analysis</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-warm-border pt-3 sm:grid-cols-4">
          {WORKFLOW_STEPS.map((step) => (
            <div key={step.num} className="text-[11px]">
              <span className="font-mono font-bold text-royal">{step.num}</span>
              <span className="mx-1 text-subtle">—</span>
              <span className="font-semibold text-ink">{step.title}.</span>{' '}
              <span className="text-muted">{step.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main 2-Column Live Privacy Workbench */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: INPUT DOCUMENT & CONTROLS */}
        <section className="cs-card flex flex-col p-4 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink">
                Input Document
              </h2>
              {documentSource.fileName && (
                <span className="rounded-md bg-cream px-2 py-0.5 text-[11px] font-medium text-muted">
                  {documentSource.fileName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-muted">
                {charCount.toLocaleString()} chars · {lineCount.toLocaleString()} lines
              </span>
              <button
                type="button"
                onClick={executeClear}
                disabled={!canClear}
                aria-label="Clear workspace"
                className="cs-focus-ring inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-warm-border bg-surface px-2.5 py-1 text-xs font-medium text-[#732820] transition-colors hover:border-[#DFB3AC] hover:bg-status-error/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted">Try sample:</span>
            {SYNTHETIC_SAMPLES.map((sample, idx) => {
              const isActiveSample = documentSource.sampleId === sample.id;
              const Icon = SAMPLE_ICONS[sample.id] ?? FileText;
              const defaultTint =
                idx === 1
                  ? 'border-[#C6B2DE] bg-lavender/60 text-royal-hover hover:bg-lavender'
                  : 'border-[#B6D4BA] bg-sage/55 text-forest-hover hover:bg-sage';

              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample.id)}
                  className={`cs-focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    isActiveSample
                      ? 'border-forest bg-forest text-surface'
                      : defaultTint
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{sample.title}</span>
                </button>
              );
            })}
          </div>

          <label htmlFor="document-editor" className="sr-only">
            Paste sensitive text or upload a document
          </label>
          <textarea
            ref={editorRef}
            id="document-editor"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setDocumentInputMeta({ kind: 'paste' }, null);
            }}
            placeholder="Paste sensitive text here or upload a document to detect and sanitize personal information."
            className="cs-focus-ring mt-2.5 h-44 w-full resize-y rounded-xl border border-warm-border bg-cream/35 p-3 font-mono text-xs leading-relaxed text-ink placeholder:text-subtle lg:h-[188px]"
          />

          <div className="mt-2">
            <UploadDropZone />
          </div>

          {/* Compact Sanitization Modes */}
          <div className="mt-3 border-t border-warm-border pt-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Sanitization Mode</span>
              <span className="text-[11px] text-muted">
                {SANITIZATION_MODE_META[sanitizationMode].example}
              </span>
            </div>
            <div
              className="grid grid-cols-1 gap-1.5 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Sanitization mode"
            >
              {(Object.keys(SANITIZATION_MODE_META) as SanitizationMode[]).map((modeKey) => {
                const meta = SANITIZATION_MODE_META[modeKey];
                const selected = sanitizationMode === modeKey;
                const label =
                  modeKey === 'full_mask'
                    ? 'Full Mask'
                    : modeKey === 'partial_mask'
                      ? 'Partial Mask'
                      : 'Pseudonymize';
                const hint =
                  modeKey === 'full_mask'
                    ? '[REDACTED]'
                    : modeKey === 'partial_mask'
                      ? 'Keep last 4 / domain'
                      : 'Stable EMAIL_01';

                return (
                  <button
                    key={modeKey}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={meta.description}
                    onClick={() => setSanitizationMode(modeKey)}
                    className={`cs-focus-ring flex flex-col rounded-xl border px-3 py-1.5 text-left transition-colors ${
                      selected
                        ? 'border-forest bg-sage/65 text-forest-hover'
                        : 'border-warm-border bg-surface text-ink hover:bg-cream/60'
                    }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[11px] opacity-80">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Protection Controls */}
          <div className="mt-2.5 border-t border-warm-border pt-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">Protection Categories</span>
              <span className="text-[11px] text-muted">
                Checked = sanitized · Badges = detected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DIRECT_CATEGORY_ITEMS.map(({ key, label }) => {
                const enabled = enabledDirectCategories.includes(key);
                const count = detectedCounts.direct[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={enabled}
                    onClick={() => toggleDirectCategory(key)}
                    className={`cs-focus-ring inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                      enabled
                        ? 'border-forest bg-sage/55 text-forest-hover'
                        : 'border-warm-border bg-surface text-muted hover:bg-cream'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        enabled
                          ? 'border-forest bg-forest text-surface'
                          : 'border-subtle bg-surface'
                      }`}
                      aria-hidden="true"
                    >
                      {enabled ? '✓' : ''}
                    </span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="rounded bg-surface/90 px-1 text-[10px] font-bold text-ink">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {CONTEXT_CATEGORY_ITEMS.map(({ key, label }) => {
                const enabled = enabledContextCategories.includes(key);
                const count = detectedCounts.context[key] ?? 0;
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={enabled}
                    onClick={() => toggleContextCategory(key)}
                    className={`cs-focus-ring-purple inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                      enabled
                        ? 'border-royal bg-lavender/75 text-royal-hover'
                        : 'border-warm-border bg-surface text-muted hover:bg-cream'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        enabled
                          ? 'border-royal bg-royal text-surface'
                          : 'border-subtle bg-surface'
                      }`}
                      aria-hidden="true"
                    >
                      {enabled ? '✓' : ''}
                    </span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="rounded bg-surface/90 px-1 text-[10px] font-bold text-royal-hover">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddPhrase} className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="Add custom phrase or proprietary token to redact..."
                aria-label="Custom sensitive phrase"
                className="cs-focus-ring min-h-[32px] flex-1 rounded-lg border border-warm-border bg-surface px-2.5 text-xs text-ink"
              />
              <button
                type="submit"
                className="cs-focus-ring inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-warm-border bg-cream px-2.5 text-xs font-semibold text-ink hover:bg-sage"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                <span>Add</span>
              </button>
            </form>
            {ruleError && <p className="mt-1 text-[11px] text-[#732820]">{ruleError}</p>}

            {customRules.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customRules.map((rule) => (
                  <span
                    key={rule.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E2C28E] bg-status-warning px-2 py-0.5 text-[11px] font-medium text-[#664212]"
                  >
                    {rule.pattern}
                    <button
                      type="button"
                      onClick={() => removeCustomRule(rule.id)}
                      aria-label={`Remove custom phrase ${rule.pattern}`}
                      className="rounded-full p-0.5 hover:bg-[#664212]/10"
                    >
                      <X className="h-2.5 w-2.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: SANITIZED OUTPUT & HERO RISK METER */}
        <OutputPanel
          comparisonOpen={comparisonOpen}
          onToggleComparison={() => setComparisonOpen((v) => !v)}
        />
      </div>

      {/* Expandable Comparison */}
      <ExpandableComparison
        open={comparisonOpen && hasOutput}
        onClose={() => setComparisonOpen(false)}
      />

      {/* Local Session Overview (Genuine In-Memory Metadata or Helpful Onboarding Empty State) */}
      <section className="cs-card px-4 py-3" aria-label="Recent local sessions">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <History className="h-3.5 w-3.5 text-royal" aria-hidden="true" />
            <span>Recent Local Sessions (Memory Only):</span>
          </span>
          {localSessions.length === 0 ? (
            <span className="text-[11px] text-muted">
              No documents processed in this session yet. Paste text, upload a file, or select a
              synthetic sample above to begin.
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {localSessions.map((sess) => (
                <span
                  key={sess.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-warm-border bg-cream/60 px-2.5 py-1 text-[11px] text-muted"
                >
                  <strong className="text-ink">{sess.sourceLabel}</strong>
                  <span>· {sess.redactedCount}/{sess.detectedCount} redacted</span>
                  <span>· {sess.verificationStatus}</span>
                  <span>({sess.timestamp})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Start a new analysis?"
        message="This clears your current document, detected findings, verification report, and temporary pseudonym mappings from memory."
        confirmLabel="Clear & Start New"
        onConfirm={() => {
          setConfirmResetOpen(false);
          executeClear();
          window.setTimeout(() => editorRef.current?.focus(), 0);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
};
