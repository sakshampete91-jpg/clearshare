import React from 'react';
import { ArrowLeft, ArrowRight, Columns2, ShieldAlert } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { ExpandableComparison } from '../components/comparison/ExpandableComparison';
import { LinkabilityCard } from '../components/simulator/LinkabilityCard';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusPill } from '../components/ui/StatusPill';

export const ComparisonReviewPage: React.FC = () => {
  const {
    rawText,
    hasAnalyzed,
    redactionResult,
    simulationResult,
    verificationReport,
    verificationStatus,
    setActiveScreen,
  } = useApp();

  if (!rawText.trim() || !hasAnalyzed || !redactionResult || !simulationResult) {
    return (
      <EmptyState
        icon={Columns2}
        title="Comparison & Review"
        description="Load or enter a document in Workspace to compare original and sanitized content side by side and inspect residual privacy exposure."
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

  return (
    <div className="space-y-4">
      <section className="cs-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold text-ink">Comparison & Residual Exposure Review</h1>
              <StatusPill status={verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {verificationReport?.summary ??
                'Compare transformed spans alongside remaining identifiers and contextual clues.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('export')}
            className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <span>Proceed to Export & Reporting</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Side-by-Side Comparison with Sync Scroll & Category Highlights */}
      <ExpandableComparison open={true} onClose={() => setActiveScreen('workspace')} />

      {/* Residual Exposure & Actionable Recommendations */}
      <section className="cs-card-intelligence p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-royal" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">
            Why Residual Information May Still Be Identifying ({simulationResult.linkabilityFindings.length})
          </h2>
        </div>

        {simulationResult.linkabilityFindings.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            No deterministic multi-clue linkability combinations remain in the sanitized output.
            Note: this still does not prove complete anonymity against external background knowledge.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {simulationResult.linkabilityFindings.map((finding) => (
              <LinkabilityCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
