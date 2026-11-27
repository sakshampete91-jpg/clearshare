import React from 'react';
import { ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import type { ExposureSimulationResult, SimulationSnapshot } from '../../types/clearshare';

interface ExposureMeterProps {
  simulation: ExposureSimulationResult;
  history: SimulationSnapshot[];
}

export const ExposureMeter: React.FC<ExposureMeterProps> = ({ simulation, history }) => {
  const levelStyles = {
    Low: {
      badge: 'bg-[#BDE0C4] text-[#204B36] border-[#95C99F]',
      bar: 'bg-[#285C43]',
      width: 'w-1/3',
      Icon: ShieldCheck,
    },
    Moderate: {
      badge: 'bg-[#F5DFBA] text-[#664212] border-[#E2C28E]',
      bar: 'bg-[#B37B28]',
      width: 'w-2/3',
      Icon: ShieldAlert,
    },
    High: {
      badge: 'bg-[#F4DAD6] text-[#732820] border-[#DFB3AC]',
      bar: 'bg-[#9E352A]',
      width: 'w-full',
      Icon: ShieldAlert,
    },
  }[simulation.level];

  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const current = history.length >= 1 ? history[history.length - 1] : null;

  let deltaText: string | null = null;
  let deltaTone = 'bg-[#F5F0E6] text-[#26352D] border-[#E8E2D8]';
  if (previous && current) {
    if (current.scorePoints < previous.scorePoints) {
      deltaText = `Exposure improved: rule score dropped from ${previous.scorePoints} to ${current.scorePoints} pts (${previous.level} → ${current.level}).`;
      deltaTone = 'bg-[#BDE0C4]/65 text-[#204B36] border-[#95C99F]';
    } else if (current.scorePoints > previous.scorePoints) {
      deltaText = `Exposure worsened: rule score increased from ${previous.scorePoints} to ${current.scorePoints} pts (${previous.level} → ${current.level}).`;
      deltaTone = 'bg-[#F4DAD6] text-[#732820] border-[#DFB3AC]';
    } else {
      deltaText = `Exposure stayed the same at ${current.scorePoints} pts (${current.level} Exposure). Apply additional clue redactions below to reduce linkability.`;
      deltaTone = 'bg-[#F5DFBA] text-[#664212] border-[#E2C28E]';
    }
  }

  const LevelIcon = levelStyles.Icon;

  return (
    <div className="cs-card border-[#D2C2E4] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#60418A]">
            Transparent Rule-Based Exposure Assessment
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-base font-bold ${levelStyles.badge}`}
            >
              <LevelIcon className="h-4 w-4" aria-hidden="true" />
              <span>{simulation.level} Exposure</span>
            </span>
            <span className="rounded-lg bg-[#EAE2F2] px-3 py-1 text-xs font-semibold text-[#60418A]">
              Rule Score: {simulation.scorePoints} pts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/60 px-3 py-2">
            <div className="text-lg font-bold text-[#26352D]">
              {simulation.remainingDirectEntities.length}
            </div>
            <div className="text-[11px] text-[#5B6058]">Remaining Direct</div>
          </div>
          <div className="rounded-xl border border-[#E8E2D8] bg-[#EAE2F2]/60 px-3 py-2">
            <div className="text-lg font-bold text-[#60418A]">
              {simulation.remainingContextClues.length}
            </div>
            <div className="text-[11px] text-[#5B6058]">Indirect Clues</div>
          </div>
          <div className="rounded-xl border border-[#E8E2D8] bg-[#DCE9DD]/60 px-3 py-2">
            <div className="text-lg font-bold text-[#285C43]">
              {simulation.redactionCoveragePercent}%
            </div>
            <div className="text-[11px] text-[#5B6058]">Total Coverage</div>
          </div>
        </div>
      </div>

      {/* Visual meter */}
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#EAE2F2]">
        <div className={`h-full rounded-full transition-all ${levelStyles.bar} ${levelStyles.width}`} />
      </div>

      {deltaText && (
        <div className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-medium ${deltaTone}`}>
          {deltaText}
        </div>
      )}

      {/* Score reasoning */}
      <div className="mt-4 rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/45 p-4">
        <h3 className="text-xs font-semibold text-[#26352D]">Why this level was assigned:</h3>
        <ul className="mt-2 space-y-1 text-xs text-[#5B6058]">
          {simulation.reasons.map((reason, idx) => (
            <li key={idx}>• {reason}</li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-1.5 border-t border-[#E8E2D8] pt-2.5 text-[11px] text-[#5B6058]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#60418A]" aria-hidden="true" />
          <span>
            This score reflects deterministic rules over remaining identifiers and clue
            combinations. It is not a scientifically validated probability of identification or a
            guarantee of anonymity.
          </span>
        </p>
      </div>
    </div>
  );
};
