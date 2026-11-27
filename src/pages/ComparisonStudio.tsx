import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Columns2, Link2 } from 'lucide-react';
import { useApp } from '../app/AppContext';
import {
  CONTEXT_CLUE_META,
  ENTITY_CATEGORY_META,
  SANITIZATION_MODE_META,
} from '../utils/categoryMeta';
import type { RedactionSpan } from '../engines/redaction/sanitizeDocument';
import type { ContextClue, DetectedEntity } from '../types/clearshare';

function renderOriginalHighlighted(
  text: string,
  spans: RedactionSpan[]
): React.ReactNode {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < sorted.length; i++) {
    const span = sorted[i];
    if (span.start < cursor) continue;
    if (span.start > cursor) {
      parts.push(<span key={`o-t-${cursor}`}>{text.slice(cursor, span.start)}</span>);
    }

    const styleClass =
      span.kind === 'direct'
        ? ENTITY_CATEGORY_META[span.category as DetectedEntity['category']].highlightBg
        : 'bg-[#EAE2F2] text-[#4E3471] border-b-2 border-[#60418A]';

    parts.push(
      <mark
        key={`o-s-${i}`}
        className={`rounded px-1 py-0.5 font-mono text-xs font-medium ${styleClass}`}
        title={`Removed (${span.category})`}
      >
        {text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  }

  if (cursor < text.length) {
    parts.push(<span key={`o-end-${cursor}`}>{text.slice(cursor)}</span>);
  }
  return parts;
}

function renderSanitizedHighlighted(
  sanitizedText: string,
  remainingDirect: DetectedEntity[],
  remainingClues: ContextClue[]
): React.ReactNode {
  // Highlight remaining clues/direct items in sanitized text AND highlight redaction tokens
  type HighlightRange = {
    start: number;
    end: number;
    label: string;
    tone: string;
  };

  const ranges: HighlightRange[] = [];

  for (const d of remainingDirect) {
    ranges.push({
      start: d.start,
      end: d.end,
      label: `Remaining ${ENTITY_CATEGORY_META[d.category].shortLabel}`,
      tone: 'bg-[#F4DAD6] text-[#732820] border-b-2 border-[#A84A3E]',
    });
  }

  for (const c of remainingClues) {
    ranges.push({
      start: c.start,
      end: c.end,
      label: `Remaining ${CONTEXT_CLUE_META[c.category].label}`,
      tone: 'bg-[#F5DFBA] text-[#664212] border-b-2 border-[#B37B28]',
    });
  }

  const tokenRegex =
    /\[REDACTED[^\]]*\]|\b(?:EMAIL|PHONE|IP|PAN|AADHAAR|CARD|PERSON|LOCATION|DATE|ORG|TICKET|ACCOUNT|ID|PHRASE|CLUE)_\d{2}\b|\*{4,}\d{4}|[A-Z]{5}\*{4}[A-Z]|XXXX XXXX \d{4}|xxx\.xxx\.xxx\.\d{1,3}|[A-Za-z0-9]\*{3,6}@[A-Za-z0-9.-]+/g;

  for (const match of sanitizedText.matchAll(tokenRegex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    ranges.push({
      start,
      end,
      label: 'Sanitized token',
      tone: 'bg-[#DCE9DD] text-[#204B36] border-b-2 border-[#285C43]',
    });
  }

  ranges.sort((a, b) => a.start - b.start);
  const nonOverlapping: HighlightRange[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    nonOverlapping.push(r);
    cursor = r.end;
  }

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (let i = 0; i < nonOverlapping.length; i++) {
    const r = nonOverlapping[i];
    if (r.start > pos) {
      nodes.push(<span key={`s-t-${pos}`}>{sanitizedText.slice(pos, r.start)}</span>);
    }
    nodes.push(
      <mark
        key={`s-m-${i}`}
        title={r.label}
        className={`rounded px-1 py-0.5 font-mono text-xs font-semibold ${r.tone}`}
      >
        {sanitizedText.slice(r.start, r.end)}
      </mark>
    );
    pos = r.end;
  }
  if (pos < sanitizedText.length) {
    nodes.push(<span key={`s-end-${pos}`}>{sanitizedText.slice(pos)}</span>);
  }
  return nodes;
}

export const ComparisonStudio: React.FC = () => {
  const {
    hasAnalyzed,
    rawText,
    isCsvMode,
    csvGrid,
    sanitizationMode,
    appliedSpans,
    redactionResult,
    simulationResult,
    setActiveScreen,
  } = useApp();

  const [syncScroll, setSyncScroll] = useState(true);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncingFromRef = useRef<'left' | 'right' | null>(null);

  if (!rawText.trim() || !hasAnalyzed || !redactionResult || !simulationResult) {
    return (
      <section className="cs-card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCE9DD] text-[#285C43]">
          <Columns2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#26352D]">Comparison Studio</h1>
        <p className="mt-2 text-sm text-[#5B6058]">
          Analyze a document from the Main Workspace to compare original and sanitized content side
          by side.
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

  const handleScroll = (source: 'left' | 'right') => {
    if (!syncScroll) return;
    if (syncingFromRef.current && syncingFromRef.current !== source) return;

    const srcEl = source === 'left' ? leftRef.current : rightRef.current;
    const dstEl = source === 'left' ? rightRef.current : leftRef.current;
    if (!srcEl || !dstEl) return;

    syncingFromRef.current = source;
    const maxSrc = srcEl.scrollHeight - srcEl.clientHeight;
    const ratio = maxSrc > 0 ? srcEl.scrollTop / maxSrc : 0;
    const maxDst = dstEl.scrollHeight - dstEl.clientHeight;
    dstEl.scrollTop = ratio * maxDst;
    requestAnimationFrame(() => {
      syncingFromRef.current = null;
    });
  };

  const removedTotal =
    redactionResult.redactedDirectCount + redactionResult.redactedContextCount;

  return (
    <div className="space-y-6">
      {/* Header & Actual Counts */}
      <section className="cs-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#26352D]">Side-by-Side Comparison Studio</h1>
            <p className="mt-1 text-sm text-[#5B6058]">
              Active mode: <strong>{SANITIZATION_MODE_META[sanitizationMode].name}</strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/60 px-3 py-1.5 text-xs font-medium text-[#26352D]">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="h-4 w-4 accent-[#285C43]"
              />
              <Link2 className="h-3.5 w-3.5 text-[#285C43]" aria-hidden="true" />
              <span>Sync Scroll</span>
            </label>

            <button
              type="button"
              onClick={() => setActiveScreen('export')}
              className="cs-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#285C43] px-5 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#204B36]"
            >
              <span>Review & Export</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Actual counts strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#B6D4BA] bg-[#DCE9DD]/45 p-3">
            <div className="text-xs font-medium text-[#204B36]">Removed / Transformed</div>
            <div className="mt-1 text-2xl font-bold text-[#285C43]">{removedTotal}</div>
            <div className="text-[11px] text-[#5B6058]">
              {redactionResult.redactedDirectCount} direct · {redactionResult.redactedContextCount}{' '}
              clue(s)
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/50 p-3">
            <div className="text-xs font-medium text-[#5B6058]">Remaining Direct</div>
            <div className="mt-1 text-2xl font-bold text-[#26352D]">
              {simulationResult.remainingDirectEntities.length}
            </div>
            <div className="text-[11px] text-[#5B6058]">Unmasked identifiers</div>
          </div>

          <div className="rounded-xl border border-[#D2C2E4] bg-[#EAE2F2]/45 p-3">
            <div className="text-xs font-medium text-[#4E3471]">Remaining Indirect Clues</div>
            <div className="mt-1 text-2xl font-bold text-[#60418A]">
              {simulationResult.remainingContextClues.length}
            </div>
            <div className="text-[11px] text-[#5B6058]">Dates, locations, refs</div>
          </div>

          <div className="rounded-xl border border-[#E8E2D8] bg-[#FFFFFF] p-3">
            <div className="text-xs font-medium text-[#5B6058]">Character Delta</div>
            <div className="mt-1 text-2xl font-bold text-[#26352D]">
              {redactionResult.sanitizedText.length - rawText.length >= 0 ? '+' : ''}
              {redactionResult.sanitizedText.length - rawText.length}
            </div>
            <div className="text-[11px] text-[#5B6058]">
              {rawText.length} → {redactionResult.sanitizedText.length} chars
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#5B6058]">
          <span className="font-semibold text-[#26352D]">Legend:</span>
          <span className="inline-flex items-center gap-1 rounded bg-[#DCE9DD] px-2 py-0.5 font-medium text-[#204B36]">
            Sanitized / Email
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[#E5EEF4] px-2 py-0.5 font-medium text-[#1F4966]">
            Phone
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[#EAE2F2] px-2 py-0.5 font-medium text-[#4E3471]">
            IPv4 / Context Redacted
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[#F5DFBA] px-2 py-0.5 font-medium text-[#664212]">
            PAN / Remaining Clue
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-[#F4DAD6] px-2 py-0.5 font-medium text-[#732820]">
            Aadhaar-like / Unmasked
          </span>
        </div>
      </section>

      {/* Side-by-Side Panes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="cs-card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#E8E2D8] pb-2.5">
            <h2 className="text-sm font-semibold text-[#26352D]">Original Document</h2>
            <span className="text-xs text-[#5B6058]">{rawText.length} chars</span>
          </div>

          <div
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            className="h-[460px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/40 p-4 font-mono text-xs leading-7 text-[#26352D]"
          >
            {isCsvMode && csvGrid
              ? rawText
              : renderOriginalHighlighted(rawText, appliedSpans)}
          </div>
        </section>

        <section className="cs-card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between border-b border-[#E8E2D8] pb-2.5">
            <h2 className="text-sm font-semibold text-[#285C43]">Sanitized Document</h2>
            <span className="text-xs text-[#5B6058]">
              {redactionResult.sanitizedText.length} chars
            </span>
          </div>

          <div
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            className="h-[460px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[#B6D4BA] bg-[#FFFFFF] p-4 font-mono text-xs leading-7 text-[#26352D]"
          >
            {renderSanitizedHighlighted(
              redactionResult.sanitizedText,
              simulationResult.remainingDirectEntities,
              simulationResult.remainingContextClues
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
