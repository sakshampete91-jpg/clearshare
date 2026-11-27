import React, { useRef, useState } from 'react';
import {
  Play,
  Upload,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ShieldCheck,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { SYNTHETIC_SAMPLES } from '../data/syntheticSamples';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import type { SanitizationMode } from '../types/clearshare';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';

export const Workspace: React.FC = () => {
  const {
    rawText,
    setRawText,
    documentSource,
    sanitizationMode,
    setSanitizationMode,
    customPhrases,
    addCustomPhrase,
    removeCustomPhrase,
    loadSample,
    startAnalysis,
    clearAllData,
    setBanner,
    setDocumentInputMeta,
    logAction,
    isProcessing,
  } = useApp();

  const txtInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [phraseInput, setPhraseInput] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    expectedKind: 'txt' | 'csv'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setBanner({
        kind: 'error',
        message: 'File exceeds the 2 MB browser safety limit. Please split smaller batches.',
      });
      return;
    }

    try {
      const content = await file.text();
      if (!content.trim()) {
        setBanner({
          kind: 'warning',
          message: 'The selected file is empty. Please choose a file with content.',
        });
        return;
      }
      setRawText(content);
      setDocumentInputMeta({ kind: expectedKind, fileName: file.name }, null);
      logAction(`${expectedKind.toUpperCase()} document loaded`, `Size: ${file.size} bytes`);
      setBanner({
        kind: 'success',
        message: `Loaded ${file.name} locally in browser memory. Click "Start Analysis" to scan.`,
      });
    } catch {
      setBanner({
        kind: 'error',
        message: 'Could not read the selected file locally in the browser.',
      });
    }
  };

  const handleAddPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseInput.trim()) return;
    addCustomPhrase(phraseInput);
    setPhraseInput('');
  };

  const charCount = rawText.length;
  const lineCount = rawText ? rawText.split(/\r?\n/).length : 0;

  return (
    <div className="space-y-6">
      {/* Top workspace intro strip */}
      <section className="cs-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">
              Document Privacy Workspace
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5B6058]">
              Paste sensitive text or load a TXT/CSV document. CLEARSHARE detects personal
              identifiers, sanitizes your file, and simulates what indirect clues still reveal
              before you share it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={startAnalysis}
              disabled={isProcessing || !rawText.trim()}
              className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#285C43] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF] transition-colors hover:bg-[#204B36] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>{isProcessing ? 'Analyzing...' : 'Start Analysis'}</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              disabled={!rawText.trim() && customPhrases.length === 0}
              className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] px-4 py-2.5 text-sm font-medium text-[#26352D] hover:bg-[#F4DAD6]/45 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 text-[#732820]" aria-hidden="true" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        {/* Short Privacy Notice */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/55 px-4 py-3 text-xs leading-relaxed text-[#204B36]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#285C43]" aria-hidden="true" />
          <p>
            <strong>Strict Client-Side Privacy:</strong> Your text never leaves this browser tab.
            No backend server, external AI API, analytics, or localStorage/sessionStorage is used
            for your documents.
          </p>
        </div>
      </section>

      {/* Main 2-column grid: Left Document Editor, Right Mode & Samples */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Input Controls & Editor */}
        <section className="cs-card flex flex-col p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#26352D]">Document Input</h2>
              <p className="text-xs text-[#5B6058]">
                Source:{' '}
                <span className="font-medium text-[#26352D]">
                  {documentSource.fileName
                    ? documentSource.fileName
                    : 'Direct pasted text'}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={txtInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'txt')}
              />
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'csv')}
              />

              <button
                type="button"
                onClick={() => txtInputRef.current?.click()}
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6]"
              >
                <FileText className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
                <span>Upload TXT</span>
              </button>

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#26352D] hover:bg-[#F5F0E6]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          <label htmlFor="document-editor" className="sr-only">
            Paste sensitive text or edit loaded document
          </label>
          <textarea
            id="document-editor"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setDocumentInputMeta({ kind: 'paste' }, null);
            }}
            placeholder="Paste a support ticket, bug report, HR note, or CSV content here — or load one of the synthetic samples on the right..."
            rows={14}
            className="cs-focus-ring mt-4 w-full flex-1 resize-y rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/35 p-4 font-mono text-sm leading-relaxed text-[#26352D] placeholder:text-[#777B72]"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B6058]">
            <span>
              {charCount.toLocaleString()} characters · {lineCount.toLocaleString()} lines
            </span>
            <span className="inline-flex items-center gap-1">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Supports plain text (.txt) and structured tables (.csv)
            </span>
          </div>
        </section>

        {/* Right: Sanitization Mode, Custom Phrases, & Synthetic Samples */}
        <div className="space-y-6 lg:col-span-5">
          {/* Sanitization Mode Selector */}
          <section className="cs-card p-5">
            <h2 className="text-base font-semibold text-[#26352D]">
              Processing & Sanitization Mode
            </h2>
            <p className="mt-1 text-xs text-[#5B6058]">
              Choose how detected identifiers should be transformed.
            </p>

            <div className="mt-3.5 space-y-2.5" role="radiogroup" aria-label="Sanitization mode">
              {(Object.keys(SANITIZATION_MODE_META) as SanitizationMode[]).map((modeKey) => {
                const meta = SANITIZATION_MODE_META[modeKey];
                const selected = sanitizationMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSanitizationMode(modeKey)}
                    className={`cs-focus-ring w-full rounded-xl border p-3.5 text-left transition-colors ${
                      selected
                        ? 'border-[#285C43] bg-[#DCE9DD]/45'
                        : 'border-[#E8E2D8] bg-[#FFFFFF] hover:bg-[#F5F0E6]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#26352D]">{meta.name}</span>
                      <span
                        className={`h-4 w-4 rounded-full border-2 ${
                          selected
                            ? 'border-[#285C43] bg-[#285C43]'
                            : 'border-[#777B72] bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#5B6058]">{meta.description}</p>
                    <p className="mt-1.5 rounded-md bg-[#F5F0E6] px-2 py-1 font-mono text-[11px] text-[#26352D]">
                      {meta.example}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Synthetic Sample Loader */}
          <section className="cs-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#60418A]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#26352D]">
                Load Synthetic Sample
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#5B6058]">
              Fictional datasets to test detection, CSV preservation, and exposure simulation.
            </p>

            <div className="mt-3 space-y-2">
              {SYNTHETIC_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample.id)}
                  className="cs-focus-ring flex w-full items-start justify-between gap-3 rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] p-3 text-left hover:border-[#60418A]/50 hover:bg-[#EAE2F2]/30"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#26352D]">
                        {sample.title}
                      </span>
                      <span className="rounded-md bg-[#F5F0E6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#5B6058]">
                        {sample.format}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#5B6058]">{sample.description}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#EAE2F2] px-2.5 py-1 text-xs font-semibold text-[#60418A]">
                    Load
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Custom Sensitive Phrases */}
          <section className="cs-card p-5">
            <h2 className="text-sm font-semibold text-[#26352D]">
              Custom Sensitive Phrases (Optional)
            </h2>
            <p className="mt-1 text-xs text-[#5B6058]">
              Flag project codenames, internal team names, or unique phrases you want tracked.
            </p>
            <form onSubmit={handleAddPhrase} className="mt-3 flex gap-2">
              <input
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="e.g. Project Falcon"
                aria-label="Custom sensitive phrase"
                className="cs-focus-ring min-h-[40px] flex-1 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF] px-3 text-sm text-[#26352D]"
              />
              <button
                type="submit"
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-[#285C43] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#204B36]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>
            </form>
            {customPhrases.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {customPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2C28E] bg-[#F5DFBA] px-2.5 py-1 text-xs font-medium text-[#664212]"
                  >
                    {phrase}
                    <button
                      type="button"
                      onClick={() => removeCustomPhrase(phrase)}
                      aria-label={`Remove custom phrase ${phrase}`}
                      className="rounded-full p-0.5 hover:bg-[#664212]/10"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all document data?"
        message="This will permanently remove the current document text, detected entities, simulation results, and in-memory pseudonym mappings."
        confirmLabel="Clear All Data"
        onConfirm={() => {
          setConfirmClearOpen(false);
          clearAllData();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
};
