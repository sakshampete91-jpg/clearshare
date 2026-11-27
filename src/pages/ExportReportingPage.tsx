import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import {
  buildSafeExportFileName,
  copyTextToClipboard,
  downloadSanitizedFile,
} from '../engines/export/exportFile';
import {
  buildPrivacyAnalysisReport,
  formatPrivacyReportAsText,
} from '../services/reporting/reportService';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';

export const ExportReportingPage: React.FC = () => {
  const {
    rawText,
    hasAnalyzed,
    documentSource,
    isCsvMode,
    sanitizationOptions,
    redactionResult,
    simulationResult,
    verificationStatus,
    verificationReport,
    logAction,
    setBanner,
    setActiveScreen,
  } = useApp();

  const [copied, setCopied] = useState(false);

  if (!rawText.trim() || !hasAnalyzed) {
    return (
      <EmptyState
        icon={Download}
        title="Export & Reporting"
        description="Process a document in Workspace before exporting sanitized TXT/CSV outputs or a non-PII privacy analysis report."
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

  const verificationBlocked =
    !verificationReport ||
    !verificationReport.passed ||
    verificationStatus === 'Verification failed' ||
    !redactionResult ||
    !simulationResult;

  const handleDownloadTxt = () => {
    if (verificationBlocked || !redactionResult) return;
    const fileName = buildSafeExportFileName(documentSource.fileName, 'txt');
    downloadSanitizedFile(
      redactionResult.sanitizedText,
      fileName,
      'text/plain;charset=utf-8'
    );
    logAction('Sanitized TXT exported', `Downloaded ${fileName}`);
    setBanner({ kind: 'success', message: `Downloaded ${fileName} locally.` });
  };

  const handleDownloadCsv = () => {
    if (verificationBlocked || !redactionResult) return;
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
    logAction('Sanitized CSV exported', `Downloaded ${fileName}`);
    setBanner({ kind: 'success', message: `Downloaded ${fileName} locally.` });
  };

  const handleDownloadReport = (format: 'txt' | 'json') => {
    if (verificationBlocked || !redactionResult || !simulationResult || !verificationReport) {
      return;
    }
    const report = buildPrivacyAnalysisReport({
      source: documentSource,
      options: sanitizationOptions,
      redaction: redactionResult,
      simulation: simulationResult,
      verification: verificationReport,
    });

    if (format === 'json') {
      const jsonText = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clearshare-privacy-report.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      logAction('Privacy report exported', 'Downloaded clearshare-privacy-report.json (no PII)');
      return;
    }

    const txtReport = formatPrivacyReportAsText(report);
    downloadSanitizedFile(
      txtReport,
      'clearshare-privacy-report.txt',
      'text/plain;charset=utf-8'
    );
    logAction('Privacy report exported', 'Downloaded clearshare-privacy-report.txt (no PII)');
  };

  const handleCopy = async () => {
    if (verificationBlocked || !redactionResult) return;
    try {
      const ok = await copyTextToClipboard(redactionResult.sanitizedText);
      if (ok) {
        setCopied(true);
        logAction('Sanitized text copied', 'Copied sanitized text to clipboard');
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        setBanner({
          kind: 'warning',
          message: 'Clipboard API unavailable. Use Download TXT/CSV instead.',
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
    <div className="space-y-4">
      <section className="cs-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold text-ink">Export & Privacy Analysis Report</h1>
              <StatusPill status={verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted">
              Only verified outputs can be exported. Exported documents and reports never imply
              complete anonymity.
            </p>
          </div>
        </div>

        {verificationBlocked && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#DFB3AC] bg-status-error/70 p-3.5 text-xs text-[#732820]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <strong>Export blocked (fail-closed):</strong> Independent verification failed or did
              not complete. Fix the document or sanitization settings before exporting.
            </div>
          </div>
        )}

        {!verificationBlocked && verificationReport && simulationResult && redactionResult && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-warm-border bg-cream/55 p-3">
                <div className="text-[11px] text-muted">Strategy</div>
                <div className="mt-0.5 text-xs font-bold text-ink">
                  {SANITIZATION_MODE_META[sanitizationOptions.mode].shortName}
                </div>
              </div>
              <div className="rounded-xl border border-warm-border bg-cream/55 p-3">
                <div className="text-[11px] text-muted">Detected</div>
                <div className="mt-0.5 text-lg font-bold text-ink">
                  {verificationReport.originalDirectCount + verificationReport.originalClueCount}
                </div>
              </div>
              <div className="rounded-xl border border-[#B6D4BA] bg-sage/55 p-3">
                <div className="text-[11px] text-forest-hover">Transformed</div>
                <div className="mt-0.5 text-lg font-bold text-forest">
                  {redactionResult.redactedDirectCount + redactionResult.redactedContextCount}
                </div>
              </div>
              <div className="rounded-xl border border-warm-border bg-cream/55 p-3">
                <div className="text-[11px] text-muted">Remaining Signals</div>
                <div className="mt-0.5 text-lg font-bold text-ink">
                  {verificationReport.remainingDirectCount + verificationReport.remainingClueCount}
                </div>
              </div>
              <div className="rounded-xl border border-[#C6B2DE] bg-lavender/55 p-3">
                <div className="text-[11px] text-royal-hover">Exposure Level</div>
                <div className="mt-0.5 text-xs font-bold text-royal">
                  {simulationResult.level} ({simulationResult.scorePoints} pts)
                </div>
              </div>
            </div>

            {/* Export Controls */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied Safe Text!' : 'Copy Safe Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-forest bg-surface px-3.5 py-2 text-xs font-semibold text-forest hover:bg-sage/40"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sanitized TXT</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="cs-focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-forest bg-surface px-3.5 py-2 text-xs font-semibold text-forest hover:bg-sage/40"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sanitized CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReport('txt')}
                className="cs-focus-ring-purple inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#C6B2DE] bg-lavender/55 px-3.5 py-2 text-xs font-semibold text-royal-hover hover:bg-lavender"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Analysis Report (TXT)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReport('json')}
                className="cs-focus-ring-purple inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#C6B2DE] bg-lavender/55 px-3.5 py-2 text-xs font-semibold text-royal-hover hover:bg-lavender"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Analysis Report (JSON)</span>
              </button>
            </div>
          </>
        )}
      </section>

      {!verificationBlocked && verificationReport && redactionResult && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="cs-card p-5 lg:col-span-5">
            <h2 className="text-sm font-bold text-ink">Verification & Residual Findings</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {verificationReport.summary}
            </p>
            {verificationReport.residualPatterns.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-ink">
                {verificationReport.residualPatterns.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#B6D4BA] bg-sage/45 p-3 text-[11px] text-forest-hover">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Reports include aggregate counts and risk summaries only — original document text
                and pseudonym maps are never included.
              </span>
            </div>
          </section>

          <section className="cs-card p-5 lg:col-span-7">
            <h2 className="mb-2.5 text-sm font-bold text-ink">Sanitized Document Preview</h2>
            <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-warm-border bg-cream/40 p-3.5 font-mono text-xs leading-6 text-ink">
              {redactionResult.sanitizedText}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
};
