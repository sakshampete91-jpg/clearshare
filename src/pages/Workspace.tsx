import React, { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  Check,
  Columns2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
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
import {
  buildSafeExportFileName,
  copyTextToClipboard,
  downloadSanitizedFile,
} from '../engines/export/exportFile';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';
import { PrivacyRiskMeter } from '../components/simulator/PrivacyRiskMeter';
import { ExpandableComparison } from '../components/comparison/ExpandableComparison';

const DIRECT_CATEGORY_ITEMS: { key: EntityCategory; label: string }[] = [
  { key: 'EMAIL', label: 'Emails' },
  { key: 'PHONE', label: 'Phone Numbers' },
  { key: 'IPV4', label: 'IP Addresses' },
  { key: 'PAN', label: 'PAN' },
  { key: 'AADHAAR', label: 'Aadhaar-like' },
  { key: 'CARD', label: 'Cards' },
];

const CONTEXT_CATEGORY_ITEMS: { key: ContextClueCategory; label: string }[] = [
  { key: 'PERSON_NAME', label: 'Names' },
  { key: 'LOCATION', label: 'Locations' },
  { key: 'CUSTOM_PHRASE', label: 'Custom Phrases' },
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
    customPhrases,
    addCustomPhrase,
    removeCustomPhrase,
    hasAnalyzed,
    isProcessing,
    isCsvMode,
    csvStructureVerified,
    detectedEntities,
    contextClues,
    redactionResult,
    loadSample,
    loadUploadedFile,
    clearAllData,
    logAction,
    setBanner,
    setDocumentInputMeta,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [csvPreviewTable, setCsvPreviewTable] = useState(false);

  const detectedCounts = useMemo(() => {
    const direct: Record<EntityCategory, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
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

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await loadUploadedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await loadUploadedFile(file);
  };

  const handleAddPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseInput.trim()) return;
    addCustomPhrase(phraseInput);
    setPhraseInput('');
  };

  const handleCopySafeText = async () => {
    if (!redactionResult?.sanitizedText) return;
    try {
      const ok = await copyTextToClipboard(redactionResult.sanitizedText);
      if (ok) {
        setCopied(true);
        logAction('Sanitized text copied', 'Copied sanitized output to clipboard');
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        setBanner({
          kind: 'warning',
          message: 'Clipboard API unavailable in this browser context. Use Download instead.',
        });
      }
    } catch {
      setBanner({
        kind: 'error',
        message: 'Clipboard copy was blocked by browser permissions.',
      });
    }
  };

  const handleDownload = (ext: 'txt' | 'csv') => {
    if (!redactionResult?.sanitizedText) return;
    const fileName = buildSafeExportFileName(documentSource.fileName, ext);

    if (ext === 'txt') {
      downloadSanitizedFile(
        redactionResult.sanitizedText,
        fileName,
        'text/plain;charset=utf-8'
      );
      logAction('Sanitized TXT exported', `Downloaded ${fileName}`);
      return;
    }

    let csvPayload = redactionResult.sanitizedText;
    if (!isCsvMode) {
      const lines = redactionResult.sanitizedText.split(/\r?\n/);
      csvPayload = Papa.unparse(
        [['Line', 'Sanitized Content'], ...lines.map((line, i) => [String(i + 1), line])],
        { newline: '\n' }
      );
    }
    downloadSanitizedFile(csvPayload, fileName, 'text/csv;charset=utf-8');
    logAction('Sanitized CSV exported', `Downloaded ${fileName}`);
  };

  const charCount = rawText.length;
  const lineCount = rawText ? rawText.split(/\r?\n/).length : 0;
  const hasOutput = Boolean(hasAnalyzed && redactionResult?.sanitizedText);
  const removedTotal = redactionResult
    ? redactionResult.redactedDirectCount + redactionResult.redactedContextCount
    : 0;

  return (
    <div className="space-y-4">
      {/* Main 2-Column Live Privacy Workbench */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT COLUMN: INPUT DOCUMENT & CONTROLS */}
        <section className="cs-card flex flex-col p-4 lg:col-span-6">
          {/* Panel Header + Sample Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold uppercase tracking-wide text-[#26352D]">
                Input Document
              </h1>
              {documentSource.fileName && (
                <span className="rounded-md bg-[#F5F0E6] px-2 py-0.5 text-[11px] font-medium text-[#5B6058]">
                  {documentSource.fileName}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#5B6058]">
              {charCount.toLocaleString()} chars · {lineCount.toLocaleString()} lines
            </span>
          </div>

          {/* Sample Chips Directly Above Input Editor */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6058]">
              <Sparkles className="h-3 w-3 text-[#60418A]" aria-hidden="true" />
              Samples:
            </span>
            {SYNTHETIC_SAMPLES.map((sample) => {
              const isActiveSample = documentSource.sampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample.id)}
                  className={`cs-focus-ring rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActiveSample
                      ? 'border-[#60418A] bg-[#EAE2F2] text-[#4E3471]'
                      : 'border-[#E8E2D8] bg-[#F5F0E6]/70 text-[#26352D] hover:border-[#60418A]/50 hover:bg-[#EAE2F2]/50'
                  }`}
                >
                  {sample.title}
                </button>
              );
            })}
          </div>

          {/* Live Text Editor */}
          <label htmlFor="document-editor" className="sr-only">
            Paste sensitive text or upload a document
          </label>
          <textarea
            id="document-editor"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setDocumentInputMeta({ kind: 'paste' }, null);
            }}
            placeholder="Paste sensitive text here or upload a document to detect and sanitize personal information."
            className="cs-focus-ring mt-2.5 h-48 w-full resize-y rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/35 p-3 font-mono text-xs leading-relaxed text-[#26352D] placeholder:text-[#777B72] lg:h-[205px]"
          />

          {/* Single Clean Drag-and-Drop Upload Strip */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={handleFileInput}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`cs-focus-ring mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-xs transition-colors ${
              isDragging
                ? 'border-[#285C43] bg-[#DCE9DD]/60 text-[#204B36]'
                : 'border-[#E8E2D8] bg-[#F5F0E6]/40 text-[#5B6058] hover:border-[#285C43]/60 hover:bg-[#DCE9DD]/25'
            }`}
          >
            <span className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5 shrink-0 text-[#285C43]" aria-hidden="true" />
              <span>
                Drop a <strong>.txt</strong> or <strong>.csv</strong> file here, or click to upload
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-medium text-[#285C43] shadow-2xs">
              Browse
            </span>
          </div>

          {/* Compact Sanitization Modes (All 3 Visible Above Fold) */}
          <div className="mt-3 border-t border-[#E8E2D8] pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#26352D]">Sanitization Mode</span>
              <span className="text-[11px] text-[#5B6058]">
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
                    className={`cs-focus-ring flex flex-col rounded-xl border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-[#285C43] bg-[#DCE9DD]/65 text-[#204B36]'
                        : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#26352D] hover:bg-[#F5F0E6]/60'
                    }`}
                  >
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="mt-0.5 text-[11px] opacity-80">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Protection Controls */}
          <div className="mt-3 border-t border-[#E8E2D8] pt-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#26352D]">
                Protection Categories
              </span>
              <span className="text-[11px] text-[#5B6058]">
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
                        ? 'border-[#285C43] bg-[#DCE9DD]/55 text-[#204B36]'
                        : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#5B6058] hover:bg-[#F5F0E6]'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        enabled
                          ? 'border-[#285C43] bg-[#285C43] text-[#FFFFFF]'
                          : 'border-[#777B72] bg-[#FFFFFF]'
                      }`}
                      aria-hidden="true"
                    >
                      {enabled ? '✓' : ''}
                    </span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="rounded bg-[#FFFFFF]/90 px-1 text-[10px] font-bold text-[#26352D]">
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
                        ? 'border-[#60418A] bg-[#EAE2F2]/75 text-[#4E3471]'
                        : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#5B6058] hover:bg-[#F5F0E6]'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        enabled
                          ? 'border-[#60418A] bg-[#60418A] text-[#FFFFFF]'
                          : 'border-[#777B72] bg-[#FFFFFF]'
                      }`}
                      aria-hidden="true"
                    >
                      {enabled ? '✓' : ''}
                    </span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="rounded bg-[#FFFFFF]/90 px-1 text-[10px] font-bold text-[#4E3471]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline Custom Sensitive Phrase Input + Honest API Key Scope Note */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <form onSubmit={handleAddPhrase} className="flex flex-1 items-center gap-1.5">
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  placeholder="Add custom phrase or secret to redact..."
                  aria-label="Custom sensitive phrase"
                  className="cs-focus-ring min-h-[32px] flex-1 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-2.5 text-xs text-[#26352D]"
                />
                <button
                  type="submit"
                  className="cs-focus-ring inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E8E2D8] bg-[#F5F0E6] px-2.5 text-xs font-semibold text-[#26352D] hover:bg-[#DCE9DD]"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </form>
              <span className="text-[11px] text-[#5B6058]">
                API keys: not auto-detected — add as custom phrase
              </span>
            </div>

            {customPhrases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E2C28E] bg-[#F5DFBA] px-2 py-0.5 text-[11px] font-medium text-[#664212]"
                  >
                    {phrase}
                    <button
                      type="button"
                      onClick={() => removeCustomPhrase(phrase)}
                      aria-label={`Remove custom phrase ${phrase}`}
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

        {/* RIGHT COLUMN: HERO PRIVACY RISK METER & SANITIZED OUTPUT */}
        <section className="cs-card flex flex-col p-4 lg:col-span-6">
          {/* Output Header */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#26352D]">
                Sanitized Output
              </h2>
              {isProcessing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAE2F2] px-2 py-0.5 text-[11px] font-medium text-[#60418A]">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  <span>Updating</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasOutput && (
                <span className="rounded-md bg-[#DCE9DD] px-2 py-0.5 text-[11px] font-semibold text-[#204B36]">
                  {removedTotal} redacted
                </span>
              )}
              {isCsvMode && csvStructureVerified && (
                <button
                  type="button"
                  onClick={() => setCsvPreviewTable((v) => !v)}
                  className="cs-focus-ring rounded-md border border-[#E8E2D8] bg-[#F5F0E6] px-2 py-0.5 text-[11px] font-medium text-[#26352D] hover:bg-[#DCE9DD]/60"
                >
                  {csvPreviewTable ? 'Raw CSV' : 'CSV Table'}
                </button>
              )}
            </div>
          </div>

          {/* HERO FEATURE: PROMINENT PRIVACY RISK METER */}
          <PrivacyRiskMeter />

          {/* Readable Sanitized Output Area */}
          <div className="mt-3 flex-1">
            {!hasOutput ? (
              <div className="flex h-60 items-center justify-center rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/35 p-6 text-center text-xs text-[#5B6058] lg:h-[268px]">
                <p className="max-w-xs leading-relaxed">
                  Sanitized output appears here automatically as you type, paste text, or pick one
                  of the synthetic samples.
                </p>
              </div>
            ) : isCsvMode && csvPreviewTable && redactionResult?.sanitizedCsv ? (
              <div className="h-60 overflow-auto rounded-xl border border-[#B6D4BA] bg-[#FFFFFF] lg:h-[268px]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#F5F0E6]">
                      {redactionResult.sanitizedCsv.headers.map((h, i) => (
                        <th
                          key={i}
                          className="border-b border-[#E8E2D8] px-2.5 py-1.5 font-semibold text-[#26352D]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {redactionResult.sanitizedCsv.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-[#E8E2D8] last:border-0">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="max-w-[180px] whitespace-pre-wrap px-2.5 py-1.5 font-mono text-[11px] text-[#26352D]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre
                aria-label="Sanitized output text"
                className="h-60 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#B6D4BA] bg-[#FFFFFF] p-3.5 font-mono text-xs leading-relaxed text-[#26352D] select-text lg:h-[268px]"
              >
                {redactionResult?.sanitizedText}
              </pre>
            )}
          </div>

          {/* Action Bar Anchored to Output */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8E2D8] pt-3">
            <button
              type="button"
              onClick={handleCopySafeText}
              disabled={!hasOutput}
              className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#285C43] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#204B36] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied Safe Text!' : 'Copy Safe Text'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDownload('txt')}
                disabled={!hasOutput}
                title="Download sanitized TXT"
                className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Download className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
                <FileText className="h-3.5 w-3.5 text-[#5B6058]" aria-hidden="true" />
                <span>TXT</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload('csv')}
                disabled={!hasOutput}
                title="Download sanitized CSV"
                className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Download className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#5B6058]" aria-hidden="true" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setComparisonOpen((v) => !v)}
                disabled={!hasOutput}
                aria-expanded={comparisonOpen}
                className={`cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  comparisonOpen
                    ? 'border-[#285C43] bg-[#DCE9DD]/60 text-[#204B36]'
                    : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#26352D] hover:bg-[#F5F0E6]'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{comparisonOpen ? 'Hide Comparison' : 'Expand Comparison'}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                disabled={!rawText.trim() && customPhrases.length === 0}
                className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#732820] hover:bg-[#F4DAD6]/45 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Expandable Comparison & Entity Validation Details */}
      <ExpandableComparison
        open={comparisonOpen && hasOutput}
        onClose={() => setComparisonOpen(false)}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear workspace data?"
        message="This removes the input document, sanitized output, exposure findings, and in-memory pseudonym mappings."
        confirmLabel="Clear Workspace"
        onConfirm={() => {
          setConfirmClearOpen(false);
          setComparisonOpen(false);
          clearAllData();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
