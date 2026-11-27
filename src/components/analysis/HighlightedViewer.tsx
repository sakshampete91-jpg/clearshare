import React from 'react';
import type { DetectedEntity } from '../../types/clearshare';
import { ENTITY_CATEGORY_META } from '../../utils/categoryMeta';

interface HighlightedViewerProps {
  text: string;
  entities: DetectedEntity[];
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: DetectedEntity) => void;
}

export const HighlightedViewer: React.FC<HighlightedViewerProps> = ({
  text,
  entities,
  selectedEntityId,
  onSelectEntity,
}) => {
  if (!text) {
    return <p className="text-sm text-[#5B6058]">No document content loaded.</p>;
  }

  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  for (const entity of sorted) {
    if (entity.start < cursor) continue;
    if (entity.start > cursor) {
      segments.push(
        <span key={`txt-${cursor}`}>{text.slice(cursor, entity.start)}</span>
      );
    }

    const meta = ENTITY_CATEGORY_META[entity.category];
    const isSelected = selectedEntityId === entity.id;

    segments.push(
      <button
        key={entity.id}
        type="button"
        onClick={() => onSelectEntity?.(entity)}
        title={`${meta.label} (${entity.status})`}
        className={`cs-focus-ring mx-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs font-medium transition-all ${
          meta.highlightBg
        } ${isSelected ? 'ring-2 ring-[#26352D] ring-offset-1' : 'hover:opacity-90'}`}
      >
        <span>{text.slice(entity.start, entity.end)}</span>
        <span className="rounded bg-[#FFFFFF]/75 px-1 text-[10px] font-semibold uppercase tracking-tight">
          {meta.shortLabel}
        </span>
      </button>
    );

    cursor = entity.end;
  }

  if (cursor < text.length) {
    segments.push(<span key={`txt-end-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return (
    <div className="whitespace-pre-wrap break-words rounded-xl border border-[#E8E2D8] bg-[#F5F0E6]/40 p-4 font-mono text-xs leading-7 text-[#26352D]">
      {segments}
    </div>
  );
};
