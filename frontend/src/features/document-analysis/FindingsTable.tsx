import React, { useMemo, useState } from 'react';
import { ArrowUpDown, FilterX, Search } from 'lucide-react';
import type { DetectedEntity, EntityCategory } from '../../types/clearshare';
import {
  ENTITY_CATEGORY_META,
  formatSafeEntityPreview,
} from '../../utils/categoryMeta';

interface FindingsTableProps {
  entities: DetectedEntity[];
  enabledDirectCategories: EntityCategory[];
  selectedEntityId?: string | null;
  onSelectEntity: (entity: DetectedEntity) => void;
}

function maskPreviewForTable(category: EntityCategory, raw: string): string {
  if (category === 'API_KEY') return formatSafeEntityPreview(category, raw);
  if (category === 'EMAIL') {
    const at = raw.indexOf('@');
    if (at > 1) return `${raw[0]}***${raw.slice(at)}`;
  }
  if (raw.length > 6) {
    return `${raw.slice(0, 2)}••••${raw.slice(-2)}`;
  }
  return '••••';
}

function getConfidenceLabel(entity: DetectedEntity): 'High' | 'Moderate' | 'Uncertain' {
  if (entity.status === 'valid') return 'High';
  if (entity.status === 'format_only') return 'Moderate';
  return 'Uncertain';
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  entities,
  enabledDirectCategories,
  selectedEntityId,
  onSelectEntity,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<EntityCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'occurrence' | 'category'>('occurrence');

  const occurrenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ent of entities) {
      const key = `${ent.category}::${ent.normalizedValue}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [entities]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = entities.filter((e) => {
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (q) {
        const meta = ENTITY_CATEGORY_META[e.category];
        const safeText = maskPreviewForTable(e.category, e.rawValue).toLowerCase();
        if (
          !meta.label.toLowerCase().includes(q) &&
          !e.statusNote.toLowerCase().includes(q) &&
          !safeText.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'category') {
        const cmp = a.category.localeCompare(b.category);
        return cmp !== 0 ? cmp : a.start - b.start;
      }
      return a.start - b.start;
    });
  }, [entities, categoryFilter, statusFilter, searchQuery, sortBy]);

  const hasFilters =
    categoryFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter findings by category or note..."
            aria-label="Search findings"
            className="cs-focus-ring min-h-[34px] w-full rounded-lg border border-warm-border bg-surface pl-8 pr-3 text-xs text-ink"
          />
        </div>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as EntityCategory | 'ALL')}
          className="cs-focus-ring min-h-[34px] rounded-lg border border-warm-border bg-surface px-2.5 text-xs text-ink"
        >
          <option value="ALL">All Categories</option>
          {(Object.keys(ENTITY_CATEGORY_META) as EntityCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {ENTITY_CATEGORY_META[cat].shortLabel}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="cs-focus-ring min-h-[34px] rounded-lg border border-warm-border bg-surface px-2.5 text-xs text-ink"
        >
          <option value="ALL">All Statuses</option>
          <option value="valid">Valid Structure / Checksum</option>
          <option value="format_only">Format Only</option>
          <option value="uncertain">Uncertain</option>
          <option value="invalid_checksum">Invalid Checksum</option>
        </select>

        <button
          type="button"
          onClick={() =>
            setSortBy((s) => (s === 'occurrence' ? 'category' : 'occurrence'))
          }
          className="cs-focus-ring inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-warm-border bg-surface px-2.5 text-xs font-medium text-ink hover:bg-cream"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          <span>Sort: {sortBy === 'occurrence' ? 'Position' : 'Category'}</span>
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="cs-focus-ring inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-warm-border bg-cream px-2.5 text-xs font-medium text-ink hover:bg-sage"
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Findings Table (Masked Previews Only) */}
      <div className="max-h-[380px] overflow-auto rounded-xl border border-warm-border">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-cream">
            <tr>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Category
              </th>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Masked Preview
              </th>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Location / Occurrences
              </th>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Status
              </th>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Confidence
              </th>
              <th className="border-b border-warm-border px-3 py-2 font-semibold text-ink">
                Suggested Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  No matching findings for the active filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((ent) => {
                const meta = ENTITY_CATEGORY_META[ent.category];
                const occ =
                  occurrenceCounts.get(`${ent.category}::${ent.normalizedValue}`) ?? 1;
                const isProtected = enabledDirectCategories.includes(ent.category);
                const selected = selectedEntityId === ent.id;

                return (
                  <tr
                    key={ent.id}
                    onClick={() => onSelectEntity(ent)}
                    className={`cursor-pointer border-b border-warm-border last:border-0 ${
                      selected ? 'bg-sage/45' : 'bg-surface hover:bg-cream/40'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                      >
                        {meta.shortLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] font-semibold text-ink">
                      {maskPreviewForTable(ent.category, ent.rawValue)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {ent.rowIndex ? `Row ${ent.rowIndex}, ` : ''}
                      Chars {ent.start}–{ent.end}
                      {occ > 1 ? ` (×${occ})` : ''}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-ink">
                      {ent.status.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted">
                      {getConfidenceLabel(ent)}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {isProtected ? (
                        <span className="font-medium text-forest">Masked on export</span>
                      ) : (
                        <span className="font-medium text-[#732820]">
                          Enable {meta.shortLabel} redaction
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
