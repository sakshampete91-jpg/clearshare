const PAN_CATEGORY_LETTERS = new Set(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);

export function isValidEmailShape(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,24}$/.test(tld)) return false;

  return labels.every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

export function extractIndianPhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let national = '';
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    national = digits.slice(2);
  } else {
    return null;
  }

  if (!/^[6-9]\d{9}$/.test(national)) {
    return null;
  }

  return national;
}

export function isRepeatedDigitSequence(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidIPv4(candidate: string): boolean {
  const parts = candidate.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

export function inspectPanStructure(candidate: string): {
  isPanShape: boolean;
  hasStandardCategoryLetter: boolean;
} {
  const isPanShape = /^[A-Z]{5}\d{4}[A-Z]$/.test(candidate);
  if (!isPanShape) {
    return { isPanShape: false, hasStandardCategoryLetter: false };
  }
  const fourthChar = candidate[3];
  return {
    isPanShape: true,
    hasStandardCategoryLetter: PAN_CATEGORY_LETTERS.has(fourthChar),
  };
}

export function isValidLuhn(digitsOnly: string): boolean {
  if (!/^\d{13,19}$/.test(digitsOnly)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = digitsOnly.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

const PLACEHOLDER_SECRET_WORDS = new Set([
  'your_api_key',
  'your-api-key',
  'your_secret_key',
  'your_access_token',
  'example_secret',
  'placeholder',
  'changeme',
  'redacted',
  'dummy_secret',
]);

export function isLikelySecretAssignmentValue(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 16) return false;
  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_SECRET_WORDS.has(lower)) return false;
  if (/^(your_|example|placeholder|changeme|dummy|test_only|sample_)/i.test(trimmed)) {
    return false;
  }
  if (/^\*+$/.test(trimmed)) return false;
  if (/^(.)\1+$/.test(trimmed)) return false;

  // Require either long token (>=24 chars) or mixed character classes (avoid plain English words)
  let classes = 0;
  if (/[a-z]/.test(trimmed)) classes += 1;
  if (/[A-Z]/.test(trimmed)) classes += 1;
  if (/\d/.test(trimmed)) classes += 1;
  if (/[._~+/=-]/.test(trimmed)) classes += 1;

  return classes >= 2 || trimmed.length >= 24;
}
