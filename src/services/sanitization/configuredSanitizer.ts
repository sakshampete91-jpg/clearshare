import type {
  ContextClue,
  ContextClueCategory,
  CustomPatternRule,
  DetectedEntity,
  EntityCategory,
  MaskingChar,
  SanitizationOptions,
} from '../../types/clearshare';
import {
  InMemoryPseudonymRegistry,
  type RedactionSpan,
  type TextSanitizationOutput,
} from '../../engines/redaction/sanitizeDocument';
import { validateCustomRegexPattern } from '../../security/inputGuards';

export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  mode: 'full_mask',
  maskChar: '*',
  fullMaskStyle: 'token',
  partialTrailingDigits: 4,
  partialKeepEmailDomain: true,
  partialKeepDateYear: true,
  consistentPseudonyms: true,
};

const ENTITY_PSEUDONYM_PREFIX: Record<EntityCategory, string> = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IPV4: 'IP',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CARD: 'CARD',
  API_KEY: 'SECRET',
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

function repeatMask(char: MaskingChar, count: number): string {
  return char.repeat(Math.max(1, count));
}

export function formatConfiguredPartialMask(
  category: EntityCategory,
  rawValue: string,
  options: SanitizationOptions
): string {
  const m = options.maskChar;
  const keepDigits = options.partialTrailingDigits;

  switch (category) {
    case 'EMAIL': {
      const atIdx = rawValue.indexOf('@');
      if (atIdx <= 0) return '[REDACTED]';
      const local = rawValue.slice(0, atIdx);
      const domain = rawValue.slice(atIdx + 1);
      const localStars = repeatMask(m, Math.min(Math.max(local.length - 1, 3), 6));
      const maskedLocal = local.length === 1 ? m : `${local[0]}${localStars}`;
      if (options.partialKeepEmailDomain) {
        return `${maskedLocal}@${domain}`;
      }
      const dotIdx = domain.lastIndexOf('.');
      const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
      const domHead = domain[0] ?? m;
      return `${maskedLocal}@${domHead}${repeatMask(m, 4)}${tld}`;
    }
    case 'PHONE': {
      const digits = rawValue.replace(/\D/g, '');
      const tail = digits.slice(-keepDigits);
      return `${repeatMask(m, Math.max(4, 10 - keepDigits))}${tail}`;
    }
    case 'PAN': {
      const clean = rawValue.trim().toUpperCase();
      if (clean.length !== 10) return '[REDACTED]';
      return `${clean.slice(0, 5)}${repeatMask(m, 4)}${clean.slice(9)}`;
    }
    case 'CARD': {
      const digits = rawValue.replace(/\D/g, '');
      const tail = digits.slice(-keepDigits);
      const block = repeatMask(m, 4);
      return keepDigits === 2
        ? `${block} ${block} ${block} ${repeatMask(m, 2)}${tail}`
        : `${block} ${block} ${tail}`;
    }
    case 'AADHAAR': {
      const digits = rawValue.replace(/\D/g, '');
      const tail = digits.slice(-keepDigits);
      const block = repeatMask(m, 4);
      return keepDigits === 2
        ? `${block} ${block} ${repeatMask(m, 2)}${tail}`
        : `${block} ${block} ${tail}`;
    }
    case 'IPV4': {
      const parts = rawValue.split('.');
      if (parts.length !== 4) return '[REDACTED]';
      const maskedOctet = repeatMask(m, 3);
      return `${maskedOctet}.${maskedOctet}.${maskedOctet}.${parts[3]}`;
    }
    case 'API_KEY': {
      const tail = rawValue.slice(-keepDigits);
      return `${repeatMask(m, 4)}${tail}`;
    }
  }
}

export function detectCustomPatternClues(
  text: string,
  rules: CustomPatternRule[]
): ContextClue[] {
  const clues: ContextClue[] = [];
  let seq = 0;

  for (const rule of rules) {
    const trimmed = rule.pattern.trim();
    if (!trimmed) continue;

    let regex: RegExp;
    if (rule.kind === 'literal') {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, 'gi');
    } else {
      const check = validateCustomRegexPattern(trimmed);
      if (!check.valid || !check.regex) continue;
      regex = check.regex;
    }

    for (const match of text.matchAll(regex)) {
      const value = match[0];
      if (!value) continue;
      const start = match.index ?? 0;
      clues.push({
        id: `custom-${++seq}`,
        category: 'CUSTOM_PHRASE',
        value,
        normalizedValue: value.toLowerCase(),
        start,
        end: start + value.length,
        confidence: 'high',
        reason: `Matches custom ${rule.kind} rule "${rule.label || trimmed}".`,
      });
    }
  }

  return clues;
}

export function sanitizeWithOptions(
  text: string,
  entities: DetectedEntity[],
  options: SanitizationOptions,
  contextCluesToRedact: ContextClue[] = [],
  registry: InMemoryPseudonymRegistry = new InMemoryPseudonymRegistry()
): TextSanitizationOutput {
  const uniqueRunCounters = new Map<string, number>();

  const nextPseudonym = (prefix: string, normalizedKey: string): string => {
    if (options.consistentPseudonyms) {
      return registry.getOrCreate(prefix, normalizedKey);
    }
    const count = (uniqueRunCounters.get(prefix) ?? 0) + 1;
    uniqueRunCounters.set(prefix, count);
    return `${prefix}_U${String(count).padStart(2, '0')}`;
  };

  const fullMaskText = (rawLen: number): string => {
    if (options.fullMaskStyle === 'char_block') {
      return repeatMask(options.maskChar, Math.min(Math.max(rawLen, 4), 16));
    }
    return '[REDACTED]';
  };

  const candidates: RedactionSpan[] = [];

  for (const entity of entities) {
    let replacement = '[REDACTED]';
    if (options.mode === 'full_mask') {
      replacement = fullMaskText(entity.rawValue.length);
    } else if (options.mode === 'partial_mask') {
      replacement = formatConfiguredPartialMask(entity.category, entity.rawValue, options);
    } else {
      replacement = nextPseudonym(
        ENTITY_PSEUDONYM_PREFIX[entity.category],
        entity.normalizedValue
      );
    }

    candidates.push({
      start: entity.start,
      end: entity.end,
      kind: 'direct',
      category: entity.category,
      rawValue: entity.rawValue,
      normalizedValue: entity.normalizedValue,
      replacement,
    });
  }

  for (const clue of contextCluesToRedact) {
    const overlapsDirect = entities.some(
      (e) => clue.start < e.end && e.start < clue.end
    );
    if (overlapsDirect) continue;

    let replacement = '[REDACTED]';
    if (options.mode === 'pseudonymize') {
      replacement = nextPseudonym(
        CLUE_PSEUDONYM_PREFIX[clue.category],
        clue.normalizedValue
      );
    } else if (
      options.mode === 'partial_mask' &&
      clue.category === 'DATE' &&
      options.partialKeepDateYear
    ) {
      const yearMatch = clue.value.match(/\b(19|20)\d{2}\b/);
      replacement = yearMatch ? `[DATE: ${yearMatch[0]}]` : '[REDACTED_DATE]';
    } else if (options.mode === 'full_mask' && options.fullMaskStyle === 'char_block') {
      replacement = fullMaskText(clue.value.length);
    }

    candidates.push({
      start: clue.start,
      end: clue.end,
      kind: 'context',
      category: clue.category,
      rawValue: clue.value,
      normalizedValue: clue.normalizedValue,
      replacement,
    });
  }

  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.kind !== b.kind) return a.kind === 'direct' ? -1 : 1;
    return b.end - b.start - (a.end - a.start);
  });

  const nonOverlapping: RedactionSpan[] = [];
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
