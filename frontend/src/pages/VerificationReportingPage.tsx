import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';

export const VerificationReportingPage: React.FC = () => {
  const {
    rawText,
    hasAnalyzed,
    sanitizationOptions,
    redactionResult,
    simulationResult,
    verificationStatus,
    verificationReport,
    setActiveScreen,
  } = useApp();

  if (!rawText.trim() || !hasAnalyzed || !verificationReport) {
    return (
      <EmptyState
        icon={ShieldCheck}
        tone="royal"
        title="Independent Verification Ready"
        description="Process a document in Workspace to run independent post-sanitization verification, re-scan transformed text, and review residual exposure."
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

  const pipelineSteps = [
    { label: '1. Transformed output received', ok: Boolean(redactionResult?.sanitizedText) },
    { label: '2. Output re-parsed independently', ok: verificationReport.structuralCheckPassed },
    { label: '3. Supported patterns re-scanned', ok: verificationReport.passed },
    { label: '4. Original vs remaining compared', ok: verificationReport.passed },
    { label: '5. Residual patterns & clues evaluated', ok: verificationReport.passed },
    { label: '6. Verification report generated', ok: Boolean(verificationReport.summary) },
  ];

  return (
    <div className="space-y-4">
      <section className="cs-card-intelligence p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-lg font-bold text-ink">
                Independent Verification & Reporting
              </h1>
              <StatusPill status={verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted">{verificationReport.summary}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('export')}
            disabled={!verificationReport.passed}
            className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>Proceed to Export</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Independent Verification Pipeline Checklist */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pipelineSteps.map((st, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                st.ok
                  ? 'border-[#B6D4BA] bg-sage/40 text-forest-hover'
                  : 'border-[#DFB3AC] bg-status-error/50 text-[#732820]'
              }`}
            >
              {st.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="font-medium">{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="cs-card p-5 lg:col-span-6">
          <h2 className="text-sm font-bold text-ink">Verification Metrics & Strategy</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-warm-border bg-cream/45 p-3">
              <dt className="text-muted">Applied Strategy</dt>
              <dd className="mt-0.5 font-bold text-ink">{sanitizationOptions.mode}</dd>
            </div>
            <div className="rounded-xl border border-warm-border bg-cream/45 p-3">
              <dt className="text-muted">Verified At</dt>
              <dd className="mt-0.5 font-bold text-ink">{verificationReport.verifiedAt}</dd>
            </div>
            <div className="rounded-xl border border-warm-border bg-cream/45 p-3">
              <dt className="text-muted">Original Findings</dt>
              <dd className="mt-0.5 font-bold text-ink">
                {verificationReport.originalDirectCount} direct ·{' '}
                {verificationReport.originalClueCount} clues
              </dd>
            </div>
            <div className="rounded-xl border border-warm-border bg-cream/45 p-3">
              <dt className="text-muted">Remaining After Re-Scan</dt>
              <dd className="mt-0.5 font-bold text-ink">
                {verificationReport.remainingDirectCount} direct ·{' '}
                {verificationReport.remainingClueCount} clues
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-[#E2C28E] bg-status-warning/45 p-3 text-xs text-[#664212]">
            <strong>Honest Limitation:</strong> &ldquo;No supported patterns detected&rdquo; means
            our deterministic rules found no supported identifiers in the transformed text. It
            never guarantees complete anonymity against external context or unsupported formats.
          </div>
        </section>

        <section className="cs-card p-5 lg:col-span-6">
          <h2 className="text-sm font-bold text-ink">Residual Findings & Next Steps</h2>
          {verificationReport.residualPatterns.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              No residual supported patterns flagged during independent re-analysis.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-xs text-ink">
              {verificationReport.residualPatterns.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-warm-border bg-cream/40 px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          {verificationReport.recommendations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-royal">
                Recommended Actions ({verificationReport.recommendations.length})
              </h3>
              <ul className="mt-1.5 space-y-1 text-xs text-muted">
                {verificationReport.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {simulationResult && (
            <div className="mt-4 text-xs text-muted">
              Current rule-based exposure assessment:{' '}
              <strong className="text-ink">
                {simulationResult.level} ({simulationResult.scorePoints} pts)
              </strong>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
