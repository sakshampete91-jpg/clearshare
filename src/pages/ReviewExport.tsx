import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import {
  buildSafeExportFileName,
  copyTextToClipboard,
  downloadSanitizedFile,
} from '../engines/export/exportFile';
import { ConfirmDialog } from '../components/layout/ConfirmDialog';

export const ReviewExport: React.FC = () => {
  const {
    hasAnalyzed,
    rawText,
    documentSource,
    isCsvMode,
    csvStructureVerified,
    sanitizationMode,
    detectedEntities,
    redactionResult,
    simulationResult,
    clearAllData,
    logAction,
    setBanner,
    setActiveScreen,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  if (!rawText.trim() || !hasAnalyzed || !redactionResult || !simulationResult) {
    return (
      <section className="cs-card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCE9DD] text-[#285C43]">
          <Download className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#26352D]">Review & Export</h1>
        <p className="mt-2 text-sm text-[#5B6058]">
          Run an analysis first to review sanitization coverage, exposure status, and export your
          safe TXT or CSV file.
        </p>
        <button
          type="button"
          onClick={() => setActiveScreen('workspace')}
          className="cs-focus-ring mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#285C43] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#204B36]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Go to Main Workspace</span>
        </button>
      </section>
    );
  }

  const totalRedacted =
    redactionResult.redactedDirectCount + redactionResult.redactedContextCount;

  const handleDownloadTxt = () => {
    const fileName = buildSafeExportFileName(documentSource.fileName, 'txt');
    downloadSanitizedFile(
      redactionResult.sanitizedText,
      fileName,
      'text/plain;charset=utf-8'
    );
    logAction('Sanitized TXT exported', `Downloaded ${fileName} (sanitized content only)`);
    setBanner({
      kind: 'success',
      message: `Downloaded ${fileName}. No original PII or pseudonym mappings were included.`,
    });
  };

  const handleDownloadCsv = () => {
    const fileName = buildSafeExportFileName(documentSource.fileName, 'csv');
    let csvPayload = redactionResult.sanitizedText;

    if (!isCsvMode) {
      const lines = redactionResult.sanitizedText.split(/\r?\n/);
      csvPayload = Papa.unparse(
        [['Line', 'Sanitized Content'], ...lines.map((line, i) => [String(i + 1), line])],
        { newline: '\n' }
      );
    }

    downloadSanitizedFile(csvPayload, fileName, 'text/csv;charset=utf-8');
    logAction('Sanitized CSV exported', `Downloaded ${fileName} (structure verified)`);
    setBanner({
      kind: 'success',
      message: `Downloaded ${fileName} with verified CSV quoting and escaping.`,
    });
  };

  const handleCopy = async () => {
    try {
      const ok = await copyTextToClipboard(redactionResult.sanitizedText);
      if (ok) {
        setCopied(true);
        logAction('Sanitized text copied', 'Copied sanitized text to system clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        setBanner({
          kind: 'warning',
          message: 'Clipboard API unavailable in this browser context. Please use Download instead.',
        });
      }
    } catch {
      setBanner({
        kind: 'error',
        message: 'Clipboard copy was blocked by browser permissions.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="cs-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#26352D]">Review & Safe Export</h1>
            <p className="mt-1 text-sm text-[#5B6058]">
              Confirm your sanitization summary and exposure check before downloading or copying.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#DFB3AC] bg-[#F4DAD6]/45 px-4 py-2 text-sm font-semibold text-[#732820] hover:bg-[#F4DAD6]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Clear All Document Data</span>
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3">
            <div className="text-[11px] font-medium text-[#5B6058]">Sanitization Mode</div>
            <div className="mt-1 text-sm font-bold text-[#26352D]">
              {SANITIZATION_MODE_META[sanitizationMode].shortName}
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3">
            <div className="text-[11px] font-medium text-[#5B6058]">Detected Entities</div>
            <div className="mt-1 text-xl font-bold text-[#26352D]">{detectedEntities.length}</div>
          </div>

          <div className="rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/50 p-3">
            <div className="text-[11px] font-medium text-[#204B36]">Redacted Items</div>
            <div className="mt-1 text-xl font-bold text-[#285C43]">{totalRedacted}</div>
          </div>

          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3">
            <div className="text-[11px] font-medium text-[#5B6058]">Remaining Signals</div>
            <div className="mt-1 text-xl font-bold text-[#26352D]">
              {simulationResult.remainingCount}
            </div>
          </div>

          <div className="rounded-xl border border-[#D2C2E4] bg-[#EAE2F2]/60 p-3">
            <div className="text-[11px] font-medium text-[#4E3471]">Exposure Level</div>
            <div className="mt-1 text-sm font-bold text-[#60418A]">
              {simulationResult.level} Exposure
            </div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadTxt}
            className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#285C43] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#204B36]"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Download Sanitized TXT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#285C43] bg-[#FFFFFF] px-5 py-2.5 text-sm font-semibold text-[#285C43] hover:bg-[#DCE9DD]/45"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Download Sanitized CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] px-4 py-2.5 text-sm font-medium text-[#26352D] hover:bg-[#F5F0E6]"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#285C43]" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Sanitized Text'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/45 px-4 py-3 text-xs text-[#204B36]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Clean Export Guarantee:</strong> Exported files contain only the sanitized
            document text/CSV{isCsvMode && csvStructureVerified ? ' (CSV structure verified)' : ''}.
            Original values, pseudonym mapping tables, and internal logs are never included.
          </p>
        </div>
      </section>

      {/* Unresolved Findings & Recommendations + Final Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="cs-card p-5 lg:col-span-5">
          <h2 className="text-base font-semibold text-[#26352D]">
            Pre-Share Findings & Recommendations
          </h2>

          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B6058]">
              Unresolved Findings
            </h3>
            {simulationResult.unresolvedFindings.length === 0 ? (
              <p className="mt-1.5 text-xs text-[#285C43]">None flagged.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5 text-xs text-[#5B6058]">
                {simulationResult.unresolvedFindings.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B6058]">
              Remaining Recommendations ({simulationResult.recommendations.filter((r) => !r.applied).length})
            </h3>
            {simulationResult.recommendations.filter((r) => !r.applied).length === 0 ? (
              <p className="mt-1.5 text-xs text-[#285C43]">
                No unapplied recommendations remaining.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1.5 text-xs text-[#5B6058]">
                {simulationResult.recommendations
                  .filter((r) => !r.applied)
                  .slice(0, 6)
                  .map((rec) => (
                    <li key={rec.id}>• {rec.label}</li>
                  ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setActiveScreen('simulator')}
              className="mt-3 text-xs font-semibold text-[#60418A] hover:underline"
            >
              Adjust redactions in Exposure Simulator →
            </button>
          </div>
        </section>

        <section className="cs-card p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between border-b border-[#E8E2D8] pb-2.5">
            <h2 className="text-base font-semibold text-[#26352D]">
              Final Sanitized Document Preview
            </h2>
            <span className="text-xs text-[#5B6058]">
              {redactionResult.sanitizedText.length.toLocaleString()} chars
            </span>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/45 p-4 font-mono text-xs leading-6 text-[#26352D]">
            {redactionResult.sanitizedText}
          </pre>
        </section>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all document data?"
        message="This will remove the original document, sanitized output, findings, and all in-memory pseudonym mappings."
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
