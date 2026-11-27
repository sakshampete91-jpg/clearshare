import React from 'react';
import { Link2 } from 'lucide-react';
import type { LinkabilityFinding } from '../../types/clearshare';

interface LinkabilityCardProps {
  finding: LinkabilityFinding;
}

export const LinkabilityCard: React.FC<LinkabilityCardProps> = ({ finding }) => {
  const isHigh = finding.severity === 'high';

  return (
    <article
      className={`rounded-xl border p-4 ${
        isHigh
          ? 'border-[#DFB3AC] bg-[#F4DAD6]/25'
          : 'border-[#D2C2E4] bg-[#EAE2F2]/35'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2
            className={`h-4 w-4 shrink-0 ${isHigh ? 'text-[#732820]' : 'text-[#60418A]'}`}
            aria-hidden="true"
          />
          <h4 className="text-sm font-semibold text-[#26352D]">{finding.title}</h4>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
            isHigh ? 'bg-[#F4DAD6] text-[#732820]' : 'bg-[#EAE2F2] text-[#60418A]'
          }`}
        >
          {finding.severity} linkability
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {finding.cluesInvolved.map((clue, idx) => (
          <span
            key={idx}
            className="rounded-md border border-[#E8E2D8] bg-[#FFFFFF] px-2 py-0.5 font-mono text-xs text-[#26352D]"
          >
            {clue}
          </span>
        ))}
      </div>

      <div className="mt-3 space-y-1.5 text-xs leading-relaxed text-[#5B6058]">
        <p>
          <strong className="text-[#26352D]">Why it matters:</strong> {finding.whyItMatters}
        </p>
        <p>
          <strong className="text-[#26352D]">Potential inference:</strong>{' '}
          {finding.potentialInference}
        </p>
        <p>
          <strong className="text-[#285C43]">Recommended action:</strong>{' '}
          {finding.recommendation}
        </p>
      </div>
    </article>
  );
};
