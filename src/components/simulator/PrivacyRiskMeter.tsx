import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Link2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { CONTEXT_CLUE_META, ENTITY_CATEGORY_META } from '../../utils/categoryMeta';
import { LinkabilityCard } from './LinkabilityCard';

export const PrivacyRiskMeter: React.FC = () => {
  const {
    hasAnalyzed,
    simulationResult,
    simulationHistory,
    additionalRedactions,
    toggleAdditionalRedaction,
    applySingleRecommendation,
  } = useApp();

  const [expanded, setExpanded] = useState(false);

  if (!hasAnalyzed || !simulationResult) {
    return (
      <div className="rounded-xl border border-[#D2C2E4] bg-[#EAE2F2]/35 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#60418A]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#60418A]">
              Privacy Exposure
            </span>
          </div>
          <span className="rounded-full bg-[#FFFFFF] px-2.5 py-0.5 text-[11px] font-medium text-[#5B6058]">
            Waiting for input
          </span>
        </div>
        <p className="mt-1 text-xs text-[#5B6058]">
          Live exposure simulation will check your sanitized output for remaining identifiers and
          linkable clues.
        </p>
      </div>
    );
  }

  const levelConfig = {
    Low: {
      container: 'border-[#95C99F] bg-[#DCE9DD]/55',
      pill: 'bg-[#285C43] text-[#FFFFFF]',
      bar: 'bg-[#285C43]',
      width: 'w-1/3',
      Icon: ShieldCheck,
    },
    Moderate: {
      container: 'border-[#E2C28E] bg-[#F5DFBA]/45',
      pill: 'bg-[#8A5A14] text-[#FFFFFF]',
      bar: 'bg-[#B37B28]',
      width: 'w-2/3',
      Icon: ShieldAlert,
    },
    High: {
      container: 'border-[#DFB3AC] bg-[#F4DAD6]/50',
      pill: 'bg-[#8B2E24] text-[#FFFFFF]',
      bar: 'bg-[#9E352A]',
      width: 'w-full',
      Icon: ShieldAlert,
    },
  }[simulationResult.level];

  const LevelIcon = levelConfig.Icon;
  const topLink = simulationResult.linkabilityFindings[0] ?? null;
  const nextRecommendation =
    simulationResult.recommendations.find(
      (r) =>
        !additionalRedactions.some(
          (v) => v.toLowerCase() === r.targetValue.toLowerCase()
        )
    ) ?? null;

  const firstRun = simulationHistory[0];
  const latestRun = simulationHistory[simulationHistory.length - 1];
  const improvedFromStart =
    firstRun && latestRun && latestRun.scorePoints < firstRun.scorePoints
      ? `Improved from ${firstRun.level} (${firstRun.scorePoints} pts) → ${latestRun.level} (${latestRun.scorePoints} pts)`
      : null;

  return (
    <section
      aria-label="Privacy Risk Meter"
      className={`rounded-xl border p-3.5 transition-colors ${levelConfig.container}`}
    >
      {/* Top Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#60418A]">
            Privacy Exposure
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${levelConfig.pill}`}
          >
            <LevelIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{simulationResult.level}</span>
          </span>
          <span className="text-xs font-medium text-[#26352D]">
            {simulationResult.remainingDirectEntities.length} remaining identifier
            {simulationResult.remainingDirectEntities.length === 1 ? '' : 's'} ·{' '}
            {simulationResult.remainingContextClues.length} contextual clue
            {simulationResult.remainingContextClues.length === 1 ? '' : 's'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="cs-focus-ring-purple inline-flex items-center gap-1 rounded-lg border border-[#D2C2E4] bg-[#FFFFFF]/90 px-2.5 py-1 text-xs font-semibold text-[#60418A] hover:bg-[#EAE2F2]"
        >
          <span>{expanded ? 'Hide Evidence' : 'Inspect Evidence'}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Compact Meter Bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#FFFFFF]/80">
        <div
          className={`h-full rounded-full transition-all ${levelConfig.bar} ${levelConfig.width}`}
        />
      </div>

      {/* Compact Intelligence Summary: Linkability + Quick Recommendation */}
      <div className="mt-2.5 space-y-1.5 text-xs">
        {topLink ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#D2C2E4] bg-[#EAE2F2]/75 px-2.5 py-1.5 text-[#4E3471]">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[#60418A]" aria-hidden="true" />
            <span className="font-semibold">Potential combination:</span>
            <span>{topLink.cluesInvolved.join(' + ')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#204B36]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>No high-risk clue combinations detected in the sanitized output.</span>
          </div>
        )}

        {nextRecommendation && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8E2D8] bg-[#FFFFFF]/85 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5 text-[#26352D]">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#60418A]" aria-hidden="true" />
              <span className="truncate">
                <strong>Recommendation:</strong> {nextRecommendation.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => applySingleRecommendation(nextRecommendation.targetValue)}
              className="cs-focus-ring-purple shrink-0 rounded-md bg-[#60418A] px-2.5 py-1 text-[11px] font-semibold text-[#FFFFFF] hover:bg-[#4E3471]"
            >
              Apply
            </button>
          </div>
        )}

        {improvedFromStart && (
          <p className="text-[11px] font-medium text-[#204B36]">{improvedFromStart}</p>
        )}
      </div>

      {/* Expandable Evidence & Controls */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-[#E8E2D8] pt-3">
          {/* Score Breakdown */}
          <div className="rounded-lg border border-[#E8E2D8] bg-[#FFFFFF]/90 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#26352D]">
                Rule-Based Breakdown ({simulationResult.scorePoints} pts)
              </span>
              <span className="text-[11px] text-[#5B6058]">
                Coverage: {simulationResult.redactionCoveragePercent}%
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-[#5B6058]">
              {simulationResult.reasons.map((reason, idx) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-[#5B6058]">
              Rule-based indicator only — not a statistical re-identification probability or
              guarantee of anonymity.
            </p>
          </div>

          {/* Remaining Direct Identifiers */}
          {simulationResult.remainingDirectEntities.length > 0 && (
            <div className="rounded-lg border border-[#DFB3AC] bg-[#FFFFFF]/90 p-3 text-xs">
              <div className="font-semibold text-[#732820]">
                Remaining Direct Identifiers ({simulationResult.remainingDirectEntities.length})
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {simulationResult.remainingDirectEntities.map((ent) => (
                  <span
                    key={ent.id}
                    className="rounded border border-[#DFB3AC] bg-[#F4DAD6] px-2 py-0.5 font-mono text-[11px] text-[#732820]"
                  >
                    {ENTITY_CATEGORY_META[ent.category].shortLabel}: {ent.rawValue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Remaining Contextual Clues */}
          {simulationResult.remainingContextClues.length > 0 && (
            <div className="rounded-lg border border-[#E8E2D8] bg-[#FFFFFF]/90 p-3 text-xs">
              <div className="font-semibold text-[#26352D]">
                Remaining Indirect Clues ({simulationResult.remainingContextClues.length})
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {simulationResult.remainingContextClues.map((clue) => {
                  const meta = CONTEXT_CLUE_META[clue.category];
                  return (
                    <span
                      key={clue.id}
                      title={clue.reason}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                    >
                      <strong>{meta.label}:</strong>
                      <span className="font-mono">{clue.value}</span>
                      {clue.confidence === 'uncertain' && (
                        <span className="opacity-75">(uncertain)</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linkability Findings */}
          {simulationResult.linkabilityFindings.length > 0 && (
            <div className="space-y-2">
              {simulationResult.linkabilityFindings.map((finding) => (
                <LinkabilityCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}

          {/* Interactive Recommendation Checklist */}
          {simulationResult.recommendations.length > 0 && (
            <div className="rounded-lg border border-[#D2C2E4] bg-[#FFFFFF]/95 p-3">
              <div className="text-xs font-semibold text-[#4E3471]">
                Toggle Additional Clue Redactions
              </div>
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {simulationResult.recommendations.map((rec) => {
                  const checked = additionalRedactions.some(
                    (v) => v.toLowerCase() === rec.targetValue.toLowerCase()
                  );
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleAdditionalRedaction(rec.targetValue)}
                      className={`cs-focus-ring-purple flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs ${
                        checked
                          ? 'border-[#60418A] bg-[#EAE2F2]/60 text-[#26352D]'
                          : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#5B6058] hover:bg-[#F5F0E6]'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[#60418A]" aria-hidden="true" />
                      ) : (
                        <Square className="h-3.5 w-3.5 shrink-0 text-[#777B72]" aria-hidden="true" />
                      )}
                      <span className="truncate font-medium text-[#26352D]">{rec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
