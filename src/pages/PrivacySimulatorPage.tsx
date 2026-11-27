import React from 'react';
import { ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import { useApp } from '../app/AppContext';
import type { MaskingChar, SanitizationMode } from '../types/clearshare';
import { SANITIZATION_MODE_META } from '../utils/categoryMeta';
import { PrivacyRiskMeter } from '../components/simulator/PrivacyRiskMeter';
import { EmptyState } from '../components/ui/EmptyState';

const MASK_CHARS: MaskingChar[] = ['*', 'X', '#', '•'];

export const PrivacySimulatorPage: React.FC = () => {
  const {
    rawText,
    hasAnalyzed,
    sanitizationOptions,
    updateSanitizationOptions,
    redactionResult,
    simulationResult,
    verificationReport,
    setActiveScreen,
  } = useApp();

  if (!rawText.trim() || !hasAnalyzed || !simulationResult || !redactionResult) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="royal"
        title="Privacy Simulator Ready"
        description="Load a sample or paste a document in Workspace to simulate how Full Masking, Partial Masking, and Consistent Pseudonymization affect residual exposure."
        action={
          <button
            type="button"
            onClick={() => setActiveScreen('workspace')}
            className="cs-focus-ring-purple inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-surface hover:bg-royal-hover"
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
      <section className="cs-card-intelligence p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-2.5 py-0.5 text-[11px] font-semibold text-royal">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Rule-Based Exposure Simulation</span>
            </span>
            <h1 className="mt-2 text-lg font-bold text-ink">Privacy Exposure Simulator</h1>
            <p className="text-xs text-muted">
              Explore transformation strategies, masking characters, and pseudonym consistency, and
              observe live independent verification results.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveScreen('comparison')}
            className="cs-focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-surface hover:bg-forest-hover"
          >
            <span>Open Side-by-Side Comparison</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Simulation Strategy & Transformation Controls */}
        <section className="cs-card space-y-4 p-5 lg:col-span-5">
          <div>
            <h2 className="text-sm font-bold text-ink">Transformation Strategy</h2>
            <div className="mt-2 space-y-2" role="radiogroup" aria-label="Simulation strategy">
              {(Object.keys(SANITIZATION_MODE_META) as SanitizationMode[]).map((modeKey) => {
                const meta = SANITIZATION_MODE_META[modeKey];
                const selected = sanitizationOptions.mode === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => updateSanitizationOptions({ mode: modeKey })}
                    className={`cs-focus-ring w-full rounded-xl border p-3 text-left text-xs transition-colors ${
                      selected
                        ? 'border-royal bg-lavender/65 text-royal-hover'
                        : 'border-warm-border bg-surface text-ink hover:bg-cream/55'
                    }`}
                  >
                    <div className="font-semibold">{meta.name}</div>
                    <div className="mt-0.5 text-[11px] opacity-85">{meta.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Masking Character & Mode-Specific Configuration */}
          <div className="space-y-3 border-t border-warm-border pt-3 text-xs">
            <h3 className="font-bold text-ink">Strategy Configuration</h3>

            <div>
              <span className="block text-[11px] font-medium text-muted">Masking Character</span>
              <div className="mt-1.5 flex gap-2">
                {MASK_CHARS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => updateSanitizationOptions({ maskChar: ch })}
                    className={`cs-focus-ring h-8 w-10 rounded-lg border font-mono text-xs font-bold ${
                      sanitizationOptions.maskChar === ch
                        ? 'border-royal bg-royal text-surface'
                        : 'border-warm-border bg-surface text-ink hover:bg-cream'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {sanitizationOptions.mode === 'full_mask' && (
              <div>
                <span className="block text-[11px] font-medium text-muted">Full Mask Style</span>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateSanitizationOptions({ fullMaskStyle: 'token' })}
                    className={`cs-focus-ring rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                      sanitizationOptions.fullMaskStyle === 'token'
                        ? 'border-royal bg-lavender text-royal-hover'
                        : 'border-warm-border bg-surface text-ink'
                    }`}
                  >
                    [REDACTED]
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSanitizationOptions({ fullMaskStyle: 'char_block' })}
                    className={`cs-focus-ring rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                      sanitizationOptions.fullMaskStyle === 'char_block'
                        ? 'border-royal bg-lavender text-royal-hover'
                        : 'border-warm-border bg-surface text-ink'
                    }`}
                  >
                    Repeated {sanitizationOptions.maskChar.repeat(4)}
                  </button>
                </div>
              </div>
            )}

            {sanitizationOptions.mode === 'partial_mask' && (
              <div className="space-y-2">
                <div>
                  <span className="block text-[11px] font-medium text-muted">
                    Trailing Digits Preserved (Phone / Card / Aadhaar)
                  </span>
                  <div className="mt-1 flex gap-2">
                    {([4, 2] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateSanitizationOptions({ partialTrailingDigits: n })}
                        className={`cs-focus-ring rounded-lg border px-3 py-1 text-[11px] font-semibold ${
                          sanitizationOptions.partialTrailingDigits === n
                            ? 'border-royal bg-lavender text-royal-hover'
                            : 'border-warm-border bg-surface text-ink'
                        }`}
                      >
                        Last {n} digits
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink">
                  <input
                    type="checkbox"
                    checked={sanitizationOptions.partialKeepEmailDomain}
                    onChange={(e) =>
                      updateSanitizationOptions({ partialKeepEmailDomain: e.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-royal"
                  />
                  <span>Preserve email domain (uncheck to mask domain)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink">
                  <input
                    type="checkbox"
                    checked={sanitizationOptions.partialKeepDateYear}
                    onChange={(e) =>
                      updateSanitizationOptions({ partialKeepDateYear: e.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-royal"
                  />
                  <span>Keep year when partially masking dates</span>
                </label>
              </div>
            )}

            {sanitizationOptions.mode === 'pseudonymize' && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink">
                <input
                  type="checkbox"
                  checked={sanitizationOptions.consistentPseudonyms}
                  onChange={(e) =>
                    updateSanitizationOptions({ consistentPseudonyms: e.target.checked })
                  }
                  className="h-3.5 w-3.5 accent-royal"
                />
                <span>
                  Consistent aliases for repeated values (e.g., EMAIL_01 across document)
                </span>
              </label>
            )}
          </div>

          {verificationReport && (
            <div className="rounded-xl border border-warm-border bg-cream/55 p-3 text-[11px] text-muted">
              <strong className="text-ink">Independent Verification:</strong>{' '}
              {verificationReport.summary}
            </div>
          )}
        </section>

        {/* Right: Hero Exposure Risk Meter & Live Simulated Output */}
        <section className="cs-card space-y-3 p-5 lg:col-span-7">
          <PrivacyRiskMeter />

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Simulated Sanitized Preview</span>
              <span className="text-muted">
                {redactionResult.redactedDirectCount + redactionResult.redactedContextCount}{' '}
                transformed
              </span>
            </div>
            <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[#B6D4BA] bg-surface p-3.5 font-mono text-xs leading-relaxed text-ink">
              {redactionResult.sanitizedText}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};
