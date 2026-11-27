import type {
  ContextClue,
  ContextClueCategory,
  DetectedEntity,
  EntityCategory,
  SanitizationMode,
} from '../../types/clearshare';
import {
  DEFAULT_SANITIZATION_OPTIONS,
  formatConfiguredPartialMask,
  sanitizeWithOptions,
} from '../../services/sanitization/configuredSanitizer';

export interface RedactionSpan {
  start: number;
  end: number;
  category: EntityCategory | ContextClueCategory;
  kind: 'direct' | 'context';
  rawValue: string;
  normalizedValue: string;
  replacement: string;
}

export interface TextSanitizationOutput {
  sanitizedText: string;
  appliedSpans: RedactionSpan[];
  redactedDirectCount: number;
  redactedContextCount: number;
}

export class InMemoryPseudonymRegistry {
  private readonly mappings = new Map<string, string>();
  private readonly counters = new Map<string, number>();

  getOrCreate(prefix: string, normalizedKey: string): string {
    const compositeKey = `${prefix}::${normalizedKey}`;
    const existing = this.mappings.get(compositeKey);
    if (existing) return existing;

    const nextNum = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, nextNum);
    const token = `${prefix}_${String(nextNum).padStart(2, '0')}`;
    this.mappings.set(compositeKey, token);
    return token;
  }

  get size(): number {
    return this.mappings.size;
  }
}

export function formatPartialMask(category: EntityCategory, rawValue: string): string {
  return formatConfiguredPartialMask(category, rawValue, DEFAULT_SANITIZATION_OPTIONS);
}

/**
 * Authoritative compatibility wrapper that delegates directly to `sanitizeWithOptions`
 * so there is one unified span-based sanitization engine across CLEARSHARE.
 */
export function sanitizeText(
  text: string,
  entities: DetectedEntity[],
  mode: SanitizationMode,
  contextCluesToRedact: ContextClue[] = [],
  registry: InMemoryPseudonymRegistry = new InMemoryPseudonymRegistry()
): TextSanitizationOutput {
  return sanitizeWithOptions(
    text,
    entities,
    { ...DEFAULT_SANITIZATION_OPTIONS, mode },
    contextCluesToRedact,
    registry
  );
}
