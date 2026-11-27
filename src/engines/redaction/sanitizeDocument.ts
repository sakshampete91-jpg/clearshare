import type {
  ContextClue,
  ContextClueCategory,
  DetectedEntity,
  EntityCategory,
  SanitizationMode,
} from '../../types/clearshare';

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

const ENTITY_PSEUDONYM_PREFIX: Record<EntityCategory, string> = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IPV4: 'IP',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CARD: 'CARD',
};

const CLUE_PSEUDONYM_PREFIX: Record<ContextClueCategory, string> = {
  PERSON_NAME: 'PERSON',
  LOCATION: 'LOCATION',
  DATE: 'DATE',
  ORGANIZATION: 'ORG',
  TICKET_REF: 'TICKET',
  ACCOUNT_REF: 'ACCOUNT',
  REPEATED_ID: 'ID',
  CUSTOM_PHRASE: 'PHRASE',
  UNCERTAIN: 'CLUE',
};

export function formatPartialMask(category: EntityCategory, rawValue: string): string {
  switch (category) {
    case 'EMAIL': {
      const atIdx = rawValue.indexOf('@');
      if (atIdx <= 0) return '[REDACTED]';
      const local = rawValue.slice(0, atIdx);
      const domain = rawValue.slice(atIdx);
      if (local.length === 1) return `*${domain}`;
      const stars = '*'.repeat(Math.min(Math.max(local.length - 1, 3), 6));
      return `${local[0]}${stars}${domain}`;
    }
    case 'PHONE': {
      const digits = rawValue.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      return `******${last4}`;
    }
    case 'PAN': {
      const clean = rawValue.trim().toUpperCase();
      if (clean.length !== 10) return '[REDACTED]';
      return `${clean.slice(0, 5)}****${clean.slice(9)}`;
    }
    case 'CARD': {
      const digits = rawValue.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      return `XXXX XXXX ${last4}`;
    }
    case 'AADHAAR': {
      const digits = rawValue.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      return `XXXX XXXX ${last4}`;
    }
    case 'IPV4': {
      const parts = rawValue.split('.');
      if (parts.length !== 4) return '[REDACTED]';
      return `xxx.xxx.xxx.${parts[3]}`;
    }
  }
}

function getEntityReplacement(
  entity: DetectedEntity,
  mode: SanitizationMode,
  registry: InMemoryPseudonymRegistry
): string {
  if (mode === 'full_mask') return '[REDACTED]';
  if (mode === 'partial_mask') return formatPartialMask(entity.category, entity.rawValue);
  const prefix = ENTITY_PSEUDONYM_PREFIX[entity.category];
  return registry.getOrCreate(prefix, entity.normalizedValue);
}

function getContextReplacement(
  clue: ContextClue,
  mode: SanitizationMode,
  registry: InMemoryPseudonymRegistry
): string {
  if (mode === 'pseudonymize') {
    const prefix = CLUE_PSEUDONYM_PREFIX[clue.category];
    return registry.getOrCreate(prefix, clue.normalizedValue);
  }
  if (mode === 'partial_mask' && clue.category === 'DATE') {
    const yearMatch = clue.value.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? `[DATE: ${yearMatch[0]}]` : '[REDACTED_DATE]';
  }
  return '[REDACTED]';
}

export function sanitizeText(
  text: string,
  entities: DetectedEntity[],
  mode: SanitizationMode,
  contextCluesToRedact: ContextClue[] = [],
  registry: InMemoryPseudonymRegistry = new InMemoryPseudonymRegistry()
): TextSanitizationOutput {
  const candidates: Array<{
    start: number;
    end: number;
    kind: 'direct' | 'context';
    category: EntityCategory | ContextClueCategory;
    rawValue: string;
    normalizedValue: string;
    replacement: string;
  }> = [];

  for (const entity of entities) {
    candidates.push({
      start: entity.start,
      end: entity.end,
      kind: 'direct',
      category: entity.category,
      rawValue: entity.rawValue,
      normalizedValue: entity.normalizedValue,
      replacement: getEntityReplacement(entity, mode, registry),
    });
  }

  for (const clue of contextCluesToRedact) {
    const overlapsDirect = entities.some(
      (e) => clue.start < e.end && e.start < clue.end
    );
    if (overlapsDirect) continue;

    candidates.push({
      start: clue.start,
      end: clue.end,
      kind: 'context',
      category: clue.category,
      rawValue: clue.value,
      normalizedValue: clue.normalizedValue,
      replacement: getContextReplacement(clue, mode, registry),
    });
  }

  // Sort by start ascending, direct spans preferred on ties, and remove overlaps
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.kind !== b.kind) return a.kind === 'direct' ? -1 : 1;
    return b.end - b.start - (a.end - a.start);
  });

  const nonOverlapping: typeof candidates = [];
  let cursor = 0;
  for (const span of candidates) {
    if (span.start < cursor) continue;
    nonOverlapping.push(span);
    cursor = span.end;
  }

  let output = '';
  let pos = 0;
  let redactedDirectCount = 0;
  let redactedContextCount = 0;

  for (const span of nonOverlapping) {
    output += text.slice(pos, span.start);
    output += span.replacement;
    pos = span.end;
    if (span.kind === 'direct') redactedDirectCount += 1;
    else redactedContextCount += 1;
  }
  output += text.slice(pos);

  return {
    sanitizedText: output,
    appliedSpans: nonOverlapping,
    redactedDirectCount,
    redactedContextCount,
  };
}
