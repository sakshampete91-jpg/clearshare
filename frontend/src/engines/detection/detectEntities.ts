import type { DetectedEntity, EntityCategory } from '../../types/clearshare';
import {
  AADHAAR_CANDIDATE_REGEX,
  AWS_ACCESS_KEY_REGEX,
  BEARER_TOKEN_REGEX,
  CARD_CANDIDATE_REGEX,
  EMAIL_REGEX,
  GITHUB_TOKEN_REGEX,
  GOOGLE_API_KEY_REGEX,
  INDIAN_PHONE_REGEX,
  IPV4_CANDIDATE_REGEX,
  OPENAI_KEY_REGEX,
  PAN_REGEX,
  SECRET_ASSIGNMENT_REGEX,
  SLACK_TOKEN_REGEX,
  STRIPE_KEY_REGEX,
} from './patterns';
import {
  extractIndianPhoneDigits,
  inspectPanStructure,
  isLikelySecretAssignmentValue,
  isRepeatedDigitSequence,
  isValidEmailShape,
  isValidIPv4,
  isValidLuhn,
} from './validators';

export interface DetectionWarning {
  id: string;
  category: EntityCategory;
  reason: string;
  start: number;
  end: number;
}

export interface DetectionOutput {
  entities: DetectedEntity[];
  warnings: DetectionWarning[];
  uniqueCountsByCategory: Record<EntityCategory, number>;
  totalCountsByCategory: Record<EntityCategory, number>;
}

const CATEGORY_PRIORITY: Record<EntityCategory, number> = {
  API_KEY: 7,
  EMAIL: 6,
  CARD: 5,
  PAN: 4,
  IPV4: 3,
  AADHAAR: 2,
  PHONE: 1,
};

function hasTokenBoundaryBefore(text: string, index: number): boolean {
  if (index <= 0) return true;
  const prev = text[index - 1];
  if (/[A-Za-z0-9_]/.test(prev)) return false;
  if (prev === '.' && index >= 2 && /\d/.test(text[index - 2])) return false;
  return true;
}

function hasTokenBoundaryAfter(text: string, index: number): boolean {
  if (index >= text.length) return true;
  const next = text[index];
  if (/[A-Za-z0-9_]/.test(next)) return false;
  if (next === '.' && index + 1 < text.length && /\d/.test(text[index + 1])) return false;
  return true;
}

function hasPhoneBoundaryBefore(text: string, index: number): boolean {
  return hasTokenBoundaryBefore(text, index);
}

function hasNumericBoundary(text: string, start: number, end: number): boolean {
  return hasTokenBoundaryBefore(text, start) && hasTokenBoundaryAfter(text, end);
}

function isPartOfLongerGroupedNumber(text: string, start: number, end: number): boolean {
  if (start >= 2 && /\d[\s-]/.test(text.slice(start - 2, start))) {
    return true;
  }
  if (end + 2 <= text.length && /[\s-]\d/.test(text.slice(end, end + 2))) {
    return true;
  }
  return false;
}

function isLikelyDateOrTimestamp12(digits: string): boolean {
  // Heuristic guard against YYYYMMDDHHMM timestamps (e.g. 202611271038)
  if (/^20\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.test(digits)) {
    return true;
  }
  return false;
}

function resolveOverlaps(candidates: DetectedEntity[]): DetectedEntity[] {
  // Sort by: longer span first, then category priority, then earlier start
  const sorted = [...candidates].sort((a, b) => {
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    const prioDiff = CATEGORY_PRIORITY[b.category] - CATEGORY_PRIORITY[a.category];
    if (prioDiff !== 0) return prioDiff;
    return a.start - b.start;
  });

  const accepted: DetectedEntity[] = [];
  for (const cand of sorted) {
    const overlaps = accepted.some(
      (existing) => cand.start < existing.end && existing.start < cand.end
    );
    if (!overlaps) {
      accepted.push(cand);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

export function detectEntities(
  text: string,
  cellMeta?: { rowIndex: number; colIndex: number; columnName?: string }
): DetectionOutput {
  const candidates: DetectedEntity[] = [];
  const warnings: DetectionWarning[] = [];
  let seq = 0;

  const nextId = (prefix: string) => `${prefix}-${++seq}`;

  // 1. Emails
  for (const match of text.matchAll(EMAIL_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (!isValidEmailShape(raw)) continue;

    candidates.push({
      id: nextId('ent'),
      category: 'EMAIL',
      rawValue: raw,
      normalizedValue: raw.trim().toLowerCase(),
      start,
      end,
      status: 'valid',
      statusNote: 'Matches valid email address structure.',
      ...cellMeta,
    });
  }

  // 2. Card candidates (13-19 digits, Luhn validated)
  for (const match of text.matchAll(CARD_CANDIDATE_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (!hasNumericBoundary(text, start, end)) continue;

    const digits = raw.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) continue;

    const luhnOk = isValidLuhn(digits);
    if (luhnOk) {
      candidates.push({
        id: nextId('ent'),
        category: 'CARD',
        rawValue: raw,
        normalizedValue: digits,
        start,
        end,
        status: 'valid',
        statusNote: 'Passes Luhn checksum. Note: Luhn validation checks digit math only and does not prove a card is active or genuine.',
        ...cellMeta,
      });
    }
    if (!luhnOk) {
      warnings.push({
        id: nextId('warn'),
        category: 'CARD',
        reason: 'Card-shaped sequence failed Luhn checksum validation.',
        start,
        end,
      });
    }
  }

  // 3. Indian PAN candidates
  for (const match of text.matchAll(PAN_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    const { isPanShape, hasStandardCategoryLetter } = inspectPanStructure(raw);
    if (!isPanShape) continue;

    candidates.push({
      id: nextId('ent'),
      category: 'PAN',
      rawValue: raw,
      normalizedValue: raw.toUpperCase(),
      start,
      end,
      status: hasStandardCategoryLetter ? 'format_only' : 'uncertain',
      statusNote: hasStandardCategoryLetter
        ? 'Matches Indian PAN structure (5 letters with standard 4th holder-category letter, 4 digits, 1 letter). Format validation does not establish government-issued validity.'
        : 'Matches 5-letter + 4-digit + 1-letter PAN shape, though the 4th character is outside common PAN holder category codes. Format validation does not establish government-issued validity.',
      ...cellMeta,
    });

    if (!hasStandardCategoryLetter) {
      warnings.push({
        id: nextId('warn'),
        category: 'PAN',
        reason: 'PAN-shaped match has an uncommon 4th category letter; verify before treating as PAN.',
        start,
        end,
      });
    }
  }

  // 4. IPv4 addresses (strict 0-255 octet check)
  for (const match of text.matchAll(IPV4_CANDIDATE_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (!hasTokenBoundaryBefore(text, start) || !hasTokenBoundaryAfter(text, end)) {
      continue;
    }

    if (isValidIPv4(raw)) {
      candidates.push({
        id: nextId('ent'),
        category: 'IPV4',
        rawValue: raw,
        normalizedValue: raw,
        start,
        end,
        status: 'valid',
        statusNote: 'All four IPv4 octets fall within 0–255.',
        ...cellMeta,
      });
    } else {
      warnings.push({
        id: nextId('warn'),
        category: 'IPV4',
        reason: 'Ignored dotted-quad string because one or more octets fall outside 0–255 or use leading zeros.',
        start,
        end,
      });
    }
  }

  // 5. Aadhaar-like 12-digit candidates
  for (const match of text.matchAll(AADHAAR_CANDIDATE_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    if (!hasNumericBoundary(text, start, end)) continue;
    if (isPartOfLongerGroupedNumber(text, start, end)) continue;

    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 12) continue;
    if (isLikelyDateOrTimestamp12(digits)) continue;

    const startsValidAadhaarDigit = /^[2-9]/.test(digits);
    const hasGrouping = /[\s-]/.test(raw);
    const nearbyContext = text
      .slice(Math.max(0, start - 32), Math.min(text.length, end + 16))
      .toLowerCase();
    const hasAadhaarHint = /\b(aadhaar|aadhar|uid|uidai)\b/.test(nearbyContext);

    // Avoid treating arbitrary unformatted 12-digit numbers starting with 0/1 as Aadhaar
    if (!startsValidAadhaarDigit && !hasGrouping && !hasAadhaarHint) {
      continue;
    }

    const isUncertain = !startsValidAadhaarDigit || (!hasGrouping && !hasAadhaarHint) || isRepeatedDigitSequence(digits);
    candidates.push({
      id: nextId('ent'),
      category: 'AADHAAR',
      rawValue: raw,
      normalizedValue: digits,
      start,
      end,
      status: isUncertain ? 'uncertain' : 'format_only',
      statusNote: isUncertain
        ? '12-digit numeric candidate (unformatted or unusual leading digit). Not UIDAI-verified; could be an unrelated reference number.'
        : '12-digit Aadhaar-like candidate (4-4-4 formatting or explicit context). Not UIDAI-verified.',
      ...cellMeta,
    });

    if (isUncertain) {
      warnings.push({
        id: nextId('warn'),
        category: 'AADHAAR',
        reason: '12-digit number flagged as uncertain Aadhaar-like candidate (not UIDAI-verified).',
        start,
        end,
      });
    }
  }

  // 6. Indian mobile numbers
  for (const match of text.matchAll(INDIAN_PHONE_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;

    if (!hasPhoneBoundaryBefore(text, start) || !hasTokenBoundaryAfter(text, end)) {
      continue;
    }

    const national = extractIndianPhoneDigits(raw);
    if (!national) continue;

    const repeated = isRepeatedDigitSequence(national);
    candidates.push({
      id: nextId('ent'),
      category: 'PHONE',
      rawValue: raw,
      normalizedValue: `+91${national}`,
      start,
      end,
      status: repeated ? 'uncertain' : 'valid',
      statusNote: repeated
        ? 'Matches 10-digit Indian phone structure but consists of a single repeated digit.'
        : 'Matches 10-digit Indian mobile pattern (normalized to +91 format).',
      ...cellMeta,
    });

    if (repeated) {
      warnings.push({
        id: nextId('warn'),
        category: 'PHONE',
        reason: 'Phone-shaped match uses a single repeated digit.',
        start,
        end,
      });
    }
  }

  // 7. API Keys & Secrets (known prefixes, bearer tokens, secret assignments)
  const addSecretCandidate = (
    raw: string,
    start: number,
    end: number,
    note: string
  ) => {
    candidates.push({
      id: nextId('ent'),
      category: 'API_KEY',
      rawValue: raw,
      normalizedValue: `secret:${raw}`,
      start,
      end,
      status: 'format_only',
      statusNote: note,
      ...cellMeta,
    });
  };

  for (const match of text.matchAll(OPENAI_KEY_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches OpenAI-style sk- secret token format (pattern match only).'
    );
  }

  for (const match of text.matchAll(AWS_ACCESS_KEY_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches AWS Access Key ID prefix (AKIA/ASIA + 16 characters).'
    );
  }

  for (const match of text.matchAll(GITHUB_TOKEN_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches GitHub Personal Access Token format.'
    );
  }

  for (const match of text.matchAll(GOOGLE_API_KEY_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches Google API Key prefix (AIza + 35 characters).'
    );
  }

  for (const match of text.matchAll(STRIPE_KEY_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches Stripe secret or restricted key prefix (sk_live_/rk_live_/test).'
    );
  }

  for (const match of text.matchAll(SLACK_TOKEN_REGEX)) {
    const raw = match[0];
    const start = match.index ?? 0;
    addSecretCandidate(
      raw,
      start,
      start + raw.length,
      'Matches Slack API token prefix (xoxb-/xoxp-/xoxa-).'
    );
  }

  for (const match of text.matchAll(BEARER_TOKEN_REGEX)) {
    const token = match[1];
    if (!token || !isLikelySecretAssignmentValue(token)) continue;
    const matchStart = match.index ?? 0;
    const relOffset = match[0].indexOf(token);
    const start = matchStart + relOffset;
    addSecretCandidate(
      token,
      start,
      start + token.length,
      'Matches Bearer authorization token structure.'
    );
  }

  for (const match of text.matchAll(SECRET_ASSIGNMENT_REGEX)) {
    const value = match[1];
    if (!value || !isLikelySecretAssignmentValue(value)) continue;
    const matchStart = match.index ?? 0;
    const relOffset = match[0].lastIndexOf(value);
    const start = matchStart + relOffset;
    addSecretCandidate(
      value,
      start,
      start + value.length,
      'High-confidence credential assignment (api_key/secret/access_token).'
    );
  }

  const entities = resolveOverlaps(candidates);

  const totalCountsByCategory: Record<EntityCategory, number> = {
    EMAIL: 0,
    PHONE: 0,
    IPV4: 0,
    PAN: 0,
    AADHAAR: 0,
    CARD: 0,
    API_KEY: 0,
  };
  const uniqueSets: Record<EntityCategory, Set<string>> = {
    EMAIL: new Set(),
    PHONE: new Set(),
    IPV4: new Set(),
    PAN: new Set(),
    AADHAAR: new Set(),
    CARD: new Set(),
    API_KEY: new Set(),
  };

  for (const entity of entities) {
    totalCountsByCategory[entity.category] += 1;
    uniqueSets[entity.category].add(entity.normalizedValue);
  }

  const uniqueCountsByCategory: Record<EntityCategory, number> = {
    EMAIL: uniqueSets.EMAIL.size,
    PHONE: uniqueSets.PHONE.size,
    IPV4: uniqueSets.IPV4.size,
    PAN: uniqueSets.PAN.size,
    AADHAAR: uniqueSets.AADHAAR.size,
    CARD: uniqueSets.CARD.size,
    API_KEY: uniqueSets.API_KEY.size,
  };

  // Filter out warnings whose spans were superseded by a valid higher-priority entity
  const filteredWarnings = warnings.filter(
    (w) =>
      !entities.some(
        (e) => e.category !== w.category && w.start < e.end && e.start < w.end
      )
  );

  return {
    entities,
    warnings: filteredWarnings,
    uniqueCountsByCategory,
    totalCountsByCategory,
  };
}
