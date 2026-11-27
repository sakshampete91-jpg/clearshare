import type { AppErrorInfo } from '../types/clearshare';

const MAX_CUSTOM_REGEX_LENGTH = 120;

export function generateSecureId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    return `${prefix}-${buf[0].toString(36)}-${buf[1].toString(36)}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

export function sanitizeDisplayFilename(fileName: string | undefined): string {
  if (!fileName) return 'Pasted text';
  const base = fileName.split(/[/\\]/).pop() ?? 'document';
  const cleaned = Array.from(base, (ch) => {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127 || '<>:"|?*'.includes(ch)) return '_';
    return ch;
  }).join('');
  return cleaned || 'document';
}

const FORMULA_LEADING_CHAR_REGEX = /^[=+\-@\t\r]/;

export function neutralizeCsvFormulaCell(cellValue: string): {
  value: string;
  neutralized: boolean;
} {
  if (!cellValue) return { value: cellValue, neutralized: false };
  if (FORMULA_LEADING_CHAR_REGEX.test(cellValue)) {
    return { value: `'${cellValue}`, neutralized: true };
  }
  return { value: cellValue, neutralized: false };
}

export function validateCustomRegexPattern(pattern: string): {
  valid: boolean;
  reason?: string;
  regex?: RegExp;
} {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Pattern cannot be empty.' };
  }
  if (trimmed.length > MAX_CUSTOM_REGEX_LENGTH) {
    return {
      valid: false,
      reason: `Custom regex must be ${MAX_CUSTOM_REGEX_LENGTH} characters or fewer.`,
    };
  }

  // Guard against nested quantifiers (ReDoS protection)
  if (/(\+|\*|\{[^}]*\})\s*\)[\s*+?]*(\+|\*|\{)/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Nested quantifiers are blocked to prevent browser freezing (ReDoS).',
    };
  }

  try {
    const compiled = new RegExp(trimmed, 'g');
    if (compiled.test('')) {
      return {
        valid: false,
        reason: 'Pattern matches empty strings; narrow it so it matches concrete tokens.',
      };
    }
    compiled.lastIndex = 0;
    return { valid: true, regex: compiled };
  } catch {
    return { valid: false, reason: 'Invalid regular expression syntax.' };
  }
}

export function buildSafeAppError(
  operation: string,
  err: unknown,
  nextStep: string,
  originalPreserved = true
): AppErrorInfo {
  const rawMessage = err instanceof Error ? err.message : 'Unexpected local processing error.';
  const safeMessage =
    rawMessage.length > 180 ? `${rawMessage.slice(0, 177)}...` : rawMessage;

  return {
    id: generateSecureId('err'),
    operation,
    whatHappened: safeMessage,
    originalPreserved,
    nextStep,
  };
}

export function containsHtmlLikeMarkup(text: string): boolean {
  return /<\s*(?:script|iframe|object|embed|img|svg|on\w+\s*=)/i.test(text);
}
