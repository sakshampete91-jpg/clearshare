import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Columns2, Link2, SearchCheck, X } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import {
  CONTEXT_CLUE_META,
  ENTITY_CATEGORY_META,
  formatSafeEntityPreview,
} from '../../utils/categoryMeta';
import type { RedactionSpan } from '../../engines/redaction/sanitizeDocument';
import type { ContextClue, DetectedEntity } from '../../types/clearshare';
import { HighlightedViewer } from '../analysis/HighlightedViewer';

interface ExpandableComparisonProps {
  open: boolean;
  onClose: () => void;
}

function renderOriginalHighlighted(text: string, spans: RedactionSpan[]): React.ReactNode {
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

export const ExpandableComparison: React.FC<ExpandableComparisonProps> = ({
  open,
  onClose,
}) => {
  const {
    rawText,
    isCsvMode,
    appliedSpans,
    redactionResult,
    simulationResult,
    detectedEntities,
    detectionWarnings,
  } = useApp();

  const [activeView, setActiveView] = useState<'diff' | 'entities'>('diff');
  const [syncScroll, setSyncScroll] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncingFromRef = useRef<'left' | 'right' | null>(null);

  const occurrenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ent of detectedEntities) {
      const key = `${ent.category}::${ent.normalizedValue}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [detectedEntities]);

  if (!open || !redactionResult || !simulationResult) return null;

  const removedTotal =
    redactionResult.redactedDirectCount + redactionResult.redactedContextCount;

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

  return (
    <section
      aria-label="Expanded Comparison and Detection Details"
      className="cs-card mt-4 p-4 sm:p-5"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('diff')}
            className={`cs-focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              activeView === 'diff'
                ? 'bg-[#285C43] text-[#FFFFFF]'
                : 'border border-[#E8E2D8] bg-[#FFFFFF] text-[#26352D] hover:bg-[#F5F0E6]'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Side-by-Side Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('entities')}
            className={`cs-focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              activeView === 'entities'
                ? 'bg-[#285C43] text-[#FFFFFF]'
                : 'border border-[#E8E2D8] bg-[#FFFFFF] text-[#26352D] hover:bg-[#F5F0E6]'
            }`}
          >
            <SearchCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Detected Entities ({detectedEntities.length})</span>
          </button>

          <div className="hidden items-center gap-2 pl-2 text-xs text-[#5B6058] sm:flex">
            <span className="rounded-md bg-[#DCE9DD] px-2 py-0.5 font-semibold text-[#204B36]">
              {removedTotal} removed
            </span>
            <span className="rounded-md bg-[#F5DFBA] px-2 py-0.5 font-semibold text-[#664212]">
              {simulationResult.remainingCount} remaining signals
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'diff' && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8E2D8] bg-[#F5F0E6]/60 px-2.5 py-1.5 text-xs font-medium text-[#26352D]">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#285C43]"
              />
              <Link2 className="h-3 w-3 text-[#285C43]" aria-hidden="true" />
              <span>Sync Scroll</span>
            </label>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse comparison"
            className="cs-focus-ring rounded-lg border border-[#E8E2D8] p-1.5 text-[#5B6058] hover:bg-[#F5F0E6] hover:text-[#26352D]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {activeView === 'diff' ? (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#26352D]">
              <span>Original Document</span>
              <span className="font-normal text-[#5B6058]">{rawText.length} chars</span>
            </div>
            <div
              ref={leftRef}
              onScroll={() => handleScroll('left')}
              className="h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/40 p-3.5 font-mono text-xs leading-6 text-[#26352D]"
            >
              {isCsvMode ? rawText : renderOriginalHighlighted(rawText, appliedSpans)}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#285C43]">
              <span>Sanitized Output</span>
              <span className="font-normal text-[#5B6058]">
                {redactionResult.sanitizedText.length} chars
              </span>
            </div>
            <div
              ref={rightRef}
              onScroll={() => handleScroll('right')}
              className="h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[#B6D4BA] bg-[#FFFFFF] p-3.5 font-mono text-xs leading-6 text-[#26352D]"
            >
              {renderSanitizedHighlighted(
                redactionResult.sanitizedText,
                simulationResult.remainingDirectEntities,
                simulationResult.remainingContextClues
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {detectionWarnings.length > 0 && (
            <div className="rounded-xl border border-[#E2C28E] bg-[#F5DFBA]/45 p-3 text-xs text-[#664212]">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Validation Warnings ({detectionWarnings.length})</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-[11px]">
                {detectionWarnings.map((w) => (
                  <li key={w.id}>
                    • <strong>{ENTITY_CATEGORY_META[w.category].shortLabel}</strong> (chars{' '}
                    {w.start}–{w.end}): {w.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="max-h-72 overflow-y-auto">
              <HighlightedViewer
                text={rawText}
                entities={detectedEntities}
                selectedEntityId={selectedEntity?.id}
                onSelectEntity={setSelectedEntity}
              />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {detectedEntities.length === 0 ? (
                <p className="text-xs text-[#5B6058]">No direct entities detected.</p>
              ) : (
                detectedEntities.map((ent) => {
                  const meta = ENTITY_CATEGORY_META[ent.category];
                  const occ =
                    occurrenceCounts.get(`${ent.category}::${ent.normalizedValue}`) ?? 1;
                  return (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => setSelectedEntity(ent)}
                      className={`cs-focus-ring w-full rounded-xl border p-2.5 text-left text-xs ${
                        selectedEntity?.id === ent.id
                          ? 'border-[#285C43] bg-[#DCE9DD]/45'
                          : 'border-[#E8E2D8] bg-[#FFFFFF] hover:bg-[#F5F0E6]/45'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                          >
                            {meta.shortLabel}
                          </span>
                          <span className="font-mono font-semibold text-[#26352D]">
                            {formatSafeEntityPreview(ent.category, ent.rawValue)}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5B6058]">
                          {ent.status.replace('_', ' ')}
                          {occ > 1 ? ` · ×${occ}` : ''} · chars {ent.start}–{ent.end}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#5B6058]">{ent.statusNote}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
