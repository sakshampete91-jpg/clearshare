import type { AppErrorInfo } from '../types/clearshare';

const MAX_CUSTOM_REGEX_LENGTH = 120;

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
    // Guard against patterns matching zero-length strings everywhere
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
  // Truncate and avoid echoing long document fragments in error banners
  const safeMessage =
    rawMessage.length > 180 ? `${rawMessage.slice(0, 177)}...` : rawMessage;

  return {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    operation,
    whatHappened: safeMessage,
    originalPreserved,
    nextStep,
  };
}

export function containsHtmlLikeMarkup(text: string): boolean {
  return /<\s*(?:script|iframe|object|embed|img|svg|on\w+\s*=)/i.test(text);
}
