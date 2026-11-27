import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  RefreshCw,
  ShieldAlert,
  Square,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../app/AppContext';
import { ExposureMeter } from '../components/simulator/ExposureMeter';
import { LinkabilityCard } from '../components/simulator/LinkabilityCard';
import {
  CONTEXT_CLUE_META,
  ENTITY_CATEGORY_META,
  SANITIZATION_MODE_META,
} from '../utils/categoryMeta';
import type { SanitizationMode } from '../types/clearshare';

export const ExposureSimulator: React.FC = () => {
  const {
    hasAnalyzed,
    rawText,
    sanitizationMode,
    simulationResult,
    simulationHistory,
    additionalRedactions,
    toggleAdditionalRedaction,
    rerunSimulation,
    isProcessing,
    setActiveScreen,
  } = useApp();

  if (!rawText.trim() || !hasAnalyzed || !simulationResult) {
    return (
      <section className="cs-card mx-auto max-w-2xl border-[#D2C2E4] p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAE2F2] text-[#60418A]">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#26352D]">Privacy Exposure Simulator</h1>
        <p className="mt-2 text-sm text-[#5B6058]">
          Analyze a document first to simulate how remaining clues and linkable combinations may
          expose context after sanitization.
        </p>
        <button
          type="button"
          onClick={() => setActiveScreen('workspace')}
          className="cs-focus-ring-purple mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#60418A] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#4E3471]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Go to Main Workspace</span>
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Flagship Header */}
      <section className="cs-card border-[#D2C2E4] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAE2F2] px-3 py-1 text-xs font-semibold text-[#60418A]">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Privacy Exposure Simulation</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-[#26352D]">
              What Your Sanitized Document Still Reveals
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-[#5B6058]">
              CLEARSHARE independently scans the <strong>already sanitized</strong> output to find
              remaining direct identifiers, indirect contextual clues, and combinations with
              potential linkability.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => rerunSimulation()}
              disabled={isProcessing}
              className="cs-focus-ring-purple inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#60418A] px-5 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#4E3471] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Re-run Simulation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScreen('comparison')}
              className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#26352D] hover:bg-[#F5F0E6]"
            >
              <span>Compare Side-by-Side</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mode Switcher inside Simulator */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E8E2D8] pt-4">
          <span className="text-xs font-semibold text-[#5B6058]">Test sanitization mode:</span>
          {(Object.keys(SANITIZATION_MODE_META) as SanitizationMode[]).map((modeKey) => {
            const active = sanitizationMode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                onClick={() => rerunSimulation(modeKey)}
                className={`cs-focus-ring-purple rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-[#60418A] bg-[#60418A] text-[#FFFFFF]'
                    : 'border-[#E8E2D8] bg-[#FFFFFF] text-[#26352D] hover:bg-[#EAE2F2]/50'
                }`}
              >
                {SANITIZATION_MODE_META[modeKey].shortName}
              </button>
            );
          })}
        </div>
      </section>

      {/* Exposure Meter & Reasoning */}
      <ExposureMeter simulation={simulationResult} history={simulationHistory} />

      {/* Main Two-Column Intelligence Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Potential Linkability & Unresolved Findings */}
        <div className="space-y-6 lg:col-span-7">
          <section className="cs-card border-[#D2C2E4] p-5">
            <h2 className="text-base font-semibold text-[#26352D]">
              Potential Linkability Analysis ({simulationResult.linkabilityFindings.length})
            </h2>
            <p className="mt-1 text-xs text-[#5B6058]">
              Individual details may seem harmless alone, but combinations can narrow down records
              or subjects.
            </p>

            {simulationResult.linkabilityFindings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/45 p-4 text-xs text-[#204B36]">
                No high-risk or moderate-risk linkable clue combinations were detected by our
                deterministic rules in the current sanitized output.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {simulationResult.linkabilityFindings.map((finding) => (
                  <LinkabilityCard key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </section>

          {/* Remaining Direct & Indirect Clues */}
          <section className="cs-card p-5">
            <h2 className="text-base font-semibold text-[#26352D]">
              Remaining Signals Detected in Sanitized Output
            </h2>

            {/* Remaining Direct Identifiers */}
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B6058]">
                Remaining Direct Identifiers ({simulationResult.remainingDirectEntities.length})
              </h3>
              {simulationResult.remainingDirectEntities.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#285C43]">
                  All detected direct identifiers were transformed by {SANITIZATION_MODE_META[sanitizationMode].shortName}.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {simulationResult.remainingDirectEntities.map((ent) => (
                    <span
                      key={ent.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFB3AC] bg-[#F4DAD6] px-2.5 py-1 font-mono text-xs text-[#732820]"
                    >
                      <strong>{ENTITY_CATEGORY_META[ent.category].shortLabel}:</strong>
                      <span>{ent.rawValue}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Remaining Indirect Clues */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B6058]">
                Remaining Indirect Clues ({simulationResult.remainingContextClues.length})
              </h3>
              {simulationResult.remainingContextClues.length === 0 ? (
                <p className="mt-1.5 text-xs text-[#285C43]">
                  No remaining indirect contextual clues flagged in the sanitized output.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {simulationResult.remainingContextClues.map((clue) => {
                    const meta = CONTEXT_CLUE_META[clue.category];
                    return (
                      <div
                        key={clue.id}
                        className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/45 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                            >
                              {meta.label}
                            </span>
                            <span className="font-mono font-semibold text-[#26352D]">
                              {clue.value}
                            </span>
                          </div>
                          <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[11px] font-medium text-[#5B6058]">
                            Confidence: {clue.confidence}
                          </span>
                        </div>
                        <p className="mt-1 text-[#5B6058]">{clue.reason}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Recommendations + Re-simulation Controls + History */}
        <div className="space-y-6 lg:col-span-5">
          <section className="cs-card border-[#D2C2E4] p-5">
            <h2 className="text-base font-semibold text-[#26352D]">
              Recommended Additional Actions
            </h2>
            <p className="mt-1 text-xs text-[#5B6058]">
              Select clues below to redact them as well, then click{' '}
              <strong>Apply & Re-run Simulation</strong>.
            </p>

            {simulationResult.recommendations.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/45 p-4 text-xs text-[#204B36]">
                No further deterministic clue redactions recommended. Review the final preview
                manually before sharing.
              </div>
            ) : (
              <>
                <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
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
                        className={`cs-focus-ring-purple flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                          checked
                            ? 'border-[#60418A] bg-[#EAE2F2]/60'
                            : 'border-[#E8E2D8] bg-[#FFFFFF] hover:bg-[#F5F0E6]/60'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare
                            className="mt-0.5 h-4 w-4 shrink-0 text-[#60418A]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Square
                            className="mt-0.5 h-4 w-4 shrink-0 text-[#777B72]"
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-[#26352D]">{rec.label}</div>
                          <p className="mt-0.5 text-[11px] text-[#5B6058]">{rec.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => rerunSimulation()}
                  className="cs-focus-ring-purple mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#60418A] px-4 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#4E3471]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Apply Selected ({additionalRedactions.length}) & Re-run Simulation
                  </span>
                </button>
              </>
            )}
          </section>

          {/* Unresolved Findings */}
          {simulationResult.unresolvedFindings.length > 0 && (
            <section className="cs-card p-5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#60418A]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#26352D]">Unresolved Findings</h2>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-xs text-[#5B6058]">
                {simulationResult.unresolvedFindings.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Simulation Run History */}
          {simulationHistory.length > 0 && (
            <section className="cs-card p-5">
              <h2 className="text-sm font-semibold text-[#26352D]">Simulation Run History</h2>
              <div className="mt-2.5 space-y-2">
                {simulationHistory.map((snap) => (
                  <div
                    key={snap.runNumber}
                    className="flex items-center justify-between rounded-lg border border-[#E8E2D8] bg-[#F5F0E6]/45 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#26352D]">Run #{snap.runNumber}</span>
                      <span className="ml-2 text-[#5B6058]">
                        ({SANITIZATION_MODE_META[snap.mode].shortName}, {snap.additionalRedactionsCount} extra)
                      </span>
                    </div>
                    <div className="font-semibold text-[#60418A]">
                      {snap.level} ({snap.scorePoints} pts)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
