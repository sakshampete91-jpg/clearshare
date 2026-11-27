import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  Check,
  Columns2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../app/AppContext';
import {
  buildSafeExportFileName,
  copyTextToClipboard,
  downloadSanitizedFile,
} from '../../engines/export/exportFile';
import { neutralizeCsvFormulaCell } from '../../security/inputGuards';
import { PrivacyRiskMeter } from '../../components/simulator/PrivacyRiskMeter';

interface OutputPanelProps {
  comparisonOpen: boolean;
  onToggleComparison: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  comparisonOpen,
  onToggleComparison,
}) => {
  const {
    documentSource,
    enabledDirectCategories,
    enabledContextCategories,
    additionalRedactions,
    hasAnalyzed,
    isProcessing,
    isCsvMode,
    csvStructureVerified,
    detectedEntities,
    contextClues,
    redactionResult,
    verificationStatus,
    verificationReport,
    logAction,
    setBanner,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [csvPreviewTable, setCsvPreviewTable] = useState(false);

  const redactionSummary = useMemo(() => {
    const directEnabledSet = new Set(enabledDirectCategories);
    const contextEnabledSet = new Set(enabledContextCategories);
    const extraSet = new Set(additionalRedactions.map((v) => v.toLowerCase()));

    const counts: Record<string, number> = {
      EMAIL: 0,
      PHONE: 0,
      IPV4: 0,
      PAN: 0,
      AADHAAR: 0,
      CARD: 0,
      API_KEY: 0,
      PERSON_NAME: 0,
      LOCATION: 0,
      OTHER_CLUE: 0,
    };

    for (const ent of detectedEntities) {
      if (directEnabledSet.has(ent.category)) {
        counts[ent.category] += 1;
      }
    }

    for (const clue of contextClues) {
      const overlapsDirect = detectedEntities.some(
        (e) =>
          directEnabledSet.has(e.category) &&
          clue.start < e.end &&
          e.start < clue.end &&
          (clue.rowIndex === undefined || clue.rowIndex === e.rowIndex)
      );
      if (overlapsDirect) continue;

      const isRedacted =
        contextEnabledSet.has(clue.category) ||
        extraSet.has(clue.normalizedValue) ||
        extraSet.has(clue.value.toLowerCase());

      if (!isRedacted) continue;

      if (clue.category === 'PERSON_NAME') counts.PERSON_NAME += 1;
      else if (clue.category === 'LOCATION') counts.LOCATION += 1;
      else counts.OTHER_CLUE += 1;
    }

    return [
      { key: 'EMAIL', label: 'Emails', count: counts.EMAIL, tone: 'bg-sage text-forest-hover' },
      { key: 'PHONE', label: 'Phones', count: counts.PHONE, tone: 'bg-[#E5EEF4] text-[#1F4966]' },
      { key: 'IPV4', label: 'IPv4', count: counts.IPV4, tone: 'bg-lavender text-royal-hover' },
      { key: 'PAN', label: 'PAN', count: counts.PAN, tone: 'bg-status-warning text-[#664212]' },
      { key: 'AADHAAR', label: 'Aadhaar-like', count: counts.AADHAAR, tone: 'bg-status-error text-[#732820]' },
      { key: 'CARD', label: 'Cards', count: counts.CARD, tone: 'bg-[#F1E4EA] text-[#682948]' },
      { key: 'API_KEY', label: 'API Keys', count: counts.API_KEY, tone: 'bg-lavender text-royal-hover' },
      { key: 'PERSON_NAME', label: 'Names', count: counts.PERSON_NAME, tone: 'bg-sage text-forest-hover' },
      { key: 'LOCATION', label: 'Locations', count: counts.LOCATION, tone: 'bg-[#E5EEF4] text-[#1F4966]' },
      ...(counts.OTHER_CLUE > 0
        ? [{ key: 'OTHER_CLUE', label: 'Extra Clues', count: counts.OTHER_CLUE, tone: 'bg-lavender text-royal-hover' }]
        : []),
    ];
  }, [
    detectedEntities,
    contextClues,
    enabledDirectCategories,
    enabledContextCategories,
    additionalRedactions,
  ]);

  const verificationBlocked =
    verificationStatus === 'Verification failed' ||
    (verificationReport !== null && !verificationReport.passed);

  const hasOutput = Boolean(
    hasAnalyzed && redactionResult?.sanitizedText && !verificationBlocked
  );

  const removedTotal = redactionResult
    ? redactionResult.redactedDirectCount + redactionResult.redactedContextCount
    : 0;

  const handleCopySafeText = async () => {
    if (!hasOutput || !redactionResult?.sanitizedText) return;
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
    if (!hasOutput || !redactionResult?.sanitizedText) return;
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
    let neutralizedNote = '';
    if (!isCsvMode) {
      const lines = redactionResult.sanitizedText.split(/\r?\n/);
      let neutralizedCount = 0;
      const rows = lines.map((line, i) => {
        const safe = neutralizeCsvFormulaCell(line);
        if (safe.neutralized) neutralizedCount += 1;
        return [String(i + 1), safe.value];
      });
      csvPayload = Papa.unparse([['Line', 'Sanitized Content'], ...rows], { newline: '\n' });
      if (neutralizedCount > 0) {
        neutralizedNote = ` (${neutralizedCount} formula-leading cell(s) neutralized with ')`;
      }
    } else if ((redactionResult.formulaNeutralizedCount ?? 0) > 0) {
      neutralizedNote = ` (${redactionResult.formulaNeutralizedCount} formula-leading cell(s) neutralized with ')`;
    }

    downloadSanitizedFile(csvPayload, fileName, 'text/csv;charset=utf-8');
    if (neutralizedNote) {
      setBanner({
        kind: 'info',
        message: `Exported ${fileName}${neutralizedNote} to prevent spreadsheet formula execution.`,
      });
    }
    logAction('Sanitized CSV exported', `Downloaded ${fileName}${neutralizedNote}`);
  };

  return (
    <section className="cs-card flex flex-col p-4 lg:col-span-6">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink">
            Sanitized Output
          </h2>
          {isProcessing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-royal">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              <span>Updating</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasOutput && (
            <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-semibold text-forest-hover">
              {removedTotal} redacted
            </span>
          )}
          {isCsvMode && csvStructureVerified && (
            <button
              type="button"
              onClick={() => setCsvPreviewTable((v) => !v)}
              className="cs-focus-ring rounded-md border border-warm-border bg-cream px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-sage/60"
            >
              {csvPreviewTable ? 'Raw CSV' : 'CSV Table'}
            </button>
          )}
        </div>
      </div>

      <PrivacyRiskMeter />

      <div className="mt-3 flex min-h-[210px] flex-1 flex-col">
        {!hasOutput ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-warm-border bg-cream/35 p-6 text-center text-xs text-muted">
            <p className="max-w-xs leading-relaxed">
              {verificationBlocked
                ? 'Output blocked because independent verification failed. Review the error notice above.'
                : 'Sanitized output appears here automatically as you paste text, upload a document (TXT, CSV, PDF, DOCX, JSON), or select a sample.'}
            </p>
          </div>
        ) : isCsvMode && csvPreviewTable && redactionResult?.sanitizedCsv ? (
          <div className="max-h-[300px] flex-1 overflow-auto rounded-xl border border-[#B6D4BA] bg-surface">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-cream">
                  {redactionResult.sanitizedCsv.headers.map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-warm-border px-2.5 py-1.5 font-semibold text-ink"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {redactionResult.sanitizedCsv.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-warm-border last:border-0">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="max-w-[180px] whitespace-pre-wrap px-2.5 py-1.5 font-mono text-[11px] text-ink"
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
            className="max-h-[300px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#B6D4BA] bg-surface p-3.5 font-mono text-xs leading-relaxed text-ink select-text"
          >
            {redactionResult?.sanitizedText}
          </pre>
        )}
      </div>

      {/* Compact REDACTION SUMMARY Strip */}
      <div
        aria-label="Redaction Summary"
        className="mt-2.5 rounded-xl border border-warm-border bg-cream/55 px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Redaction Summary
          </span>
          {!hasOutput ? (
            <span className="text-[11px] text-muted">0 items redacted</span>
          ) : (
            redactionSummary.map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  item.count > 0 ? item.tone : 'bg-surface/70 text-subtle'
                }`}
              >
                <span className="font-bold">{item.count}</span>
                <span>{item.label}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Output Toolbar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-warm-border pt-3">
        <button
          type="button"
          onClick={handleCopySafeText}
          disabled={!hasOutput}
          className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface transition-colors hover:bg-forest-hover disabled:cursor-not-allowed disabled:opacity-45"
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
            className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-warm-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
            <FileText className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span>TXT</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload('csv')}
            disabled={!hasOutput}
            title="Download sanitized CSV"
            className="cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-warm-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-cream disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onToggleComparison}
            disabled={!hasOutput}
            aria-expanded={comparisonOpen}
            className={`cs-focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              comparisonOpen
                ? 'border-forest bg-sage/60 text-forest-hover'
                : 'border-warm-border bg-surface text-ink hover:bg-cream'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{comparisonOpen ? 'Hide Comparison' : 'Expand Comparison'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
