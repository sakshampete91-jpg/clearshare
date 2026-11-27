import type { ContextClueCategory, EntityCategory, SanitizationMode } from '../types/clearshare';

export interface CategoryMeta {
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  highlightBg: string;
}

export const ENTITY_CATEGORY_META: Record<EntityCategory, CategoryMeta> = {
  EMAIL: {
    label: 'Email Address',
    shortLabel: 'Email',
    description: 'Valid email-shaped identifiers.',
    badgeBg: 'bg-[#DCE9DD]',
    badgeText: 'text-[#204B36]',
    badgeBorder: 'border-[#B6D4BA]',
    highlightBg: 'bg-[#DCE9DD] text-[#204B36] border-b-2 border-[#285C43]',
  },
  PHONE: {
    label: 'Indian Phone Number',
    shortLabel: 'Phone',
    description: '10-digit Indian mobile numbers with optional +91 or 91 prefix.',
    badgeBg: 'bg-[#E5EEF4]',
    badgeText: 'text-[#1F4966]',
    badgeBorder: 'border-[#C1D6E6]',
    highlightBg: 'bg-[#E5EEF4] text-[#1F4966] border-b-2 border-[#3A6D91]',
  },
  IPV4: {
    label: 'IPv4 Address',
    shortLabel: 'IPv4',
    description: 'IPv4 candidates validated with 0–255 octet bounds.',
    badgeBg: 'bg-[#EAE2F2]',
    badgeText: 'text-[#4E3471]',
    badgeBorder: 'border-[#D2C2E4]',
    highlightBg: 'bg-[#EAE2F2] text-[#4E3471] border-b-2 border-[#60418A]',
  },
  PAN: {
    label: 'Indian PAN Candidate',
    shortLabel: 'PAN',
    description: '10-character PAN pattern (5 letters, 4 digits, 1 letter). Format check only.',
    badgeBg: 'bg-[#F5DFBA]',
    badgeText: 'text-[#664212]',
    badgeBorder: 'border-[#E2C28E]',
    highlightBg: 'bg-[#F5DFBA] text-[#664212] border-b-2 border-[#B37B28]',
  },
  AADHAAR: {
    label: 'Aadhaar-like 12-Digit Candidate',
    shortLabel: 'Aadhaar-like',
    description: '12-digit candidate sequence with boundary checks. Not UIDAI-verified.',
    badgeBg: 'bg-[#F4DAD6]',
    badgeText: 'text-[#732820]',
    badgeBorder: 'border-[#DFB3AC]',
    highlightBg: 'bg-[#F4DAD6] text-[#732820] border-b-2 border-[#A84A3E]',
  },
  CARD: {
    label: 'Payment Card Candidate',
    shortLabel: 'Card',
    description: '13–19 digit card candidate checked with the Luhn checksum algorithm.',
    badgeBg: 'bg-[#F1E4EA]',
    badgeText: 'text-[#682948]',
    badgeBorder: 'border-[#D9BED0]',
    highlightBg: 'bg-[#F1E4EA] text-[#682948] border-b-2 border-[#8E4168]',
  },
  API_KEY: {
    label: 'API Keys & Secrets',
    shortLabel: 'API Key',
    description: 'Known token prefixes (sk-, AKIA, ghp_, AIza), bearer tokens, and secret assignments.',
    badgeBg: 'bg-[#EAE2F2]',
    badgeText: 'text-[#4E3471]',
    badgeBorder: 'border-[#C6B2DE]',
    highlightBg: 'bg-[#EAE2F2] text-[#4E3471] border-b-2 border-[#60418A]',
  },
};

export function formatSafeEntityPreview(category: EntityCategory, rawValue: string): string {
  if (category !== 'API_KEY') return rawValue;
  const tail = rawValue.length >= 8 ? rawValue.slice(-4) : '••••';
  return `[SECRET ••••${tail} · ${rawValue.length} chars]`;
}

export const CONTEXT_CLUE_META: Record<
  ContextClueCategory,
  { label: string; badgeBg: string; badgeText: string; badgeBorder: string }
> = {
  PERSON_NAME: {
    label: 'Person Name',
    badgeBg: 'bg-[#EAE2F2]',
    badgeText: 'text-[#4E3471]',
    badgeBorder: 'border-[#D2C2E4]',
  },
  LOCATION: {
    label: 'Location',
    badgeBg: 'bg-[#E5EEF4]',
    badgeText: 'text-[#1F4966]',
    badgeBorder: 'border-[#C1D6E6]',
  },
  DATE: {
    label: 'Specific Date',
    badgeBg: 'bg-[#F5DFBA]',
    badgeText: 'text-[#664212]',
    badgeBorder: 'border-[#E2C28E]',
  },
  ORGANIZATION: {
    label: 'Organization',
    badgeBg: 'bg-[#DCE9DD]',
    badgeText: 'text-[#204B36]',
    badgeBorder: 'border-[#B6D4BA]',
  },
  TICKET_REF: {
    label: 'Ticket Reference',
    badgeBg: 'bg-[#F4DAD6]',
    badgeText: 'text-[#732820]',
    badgeBorder: 'border-[#DFB3AC]',
  },
  ACCOUNT_REF: {
    label: 'Account Reference',
    badgeBg: 'bg-[#F4DAD6]',
    badgeText: 'text-[#732820]',
    badgeBorder: 'border-[#DFB3AC]',
  },
  REPEATED_ID: {
    label: 'Repeated Identifier',
    badgeBg: 'bg-[#EAE2F2]',
    badgeText: 'text-[#4E3471]',
    badgeBorder: 'border-[#D2C2E4]',
  },
  CUSTOM_PHRASE: {
    label: 'Custom Sensitive Phrase',
    badgeBg: 'bg-[#F5DFBA]',
    badgeText: 'text-[#664212]',
    badgeBorder: 'border-[#E2C28E]',
  },
  UNCERTAIN: {
    label: 'Uncertain Clue',
    badgeBg: 'bg-[#F0ECE3]',
    badgeText: 'text-[#5B6058]',
    badgeBorder: 'border-[#D8D1C4]',
  },
};

export const SANITIZATION_MODE_META: Record<
  SanitizationMode,
  { name: string; shortName: string; description: string; example: string }
> = {
  full_mask: {
    name: 'Mode A — Full Mask',
    shortName: 'Full Mask',
    description: 'Replaces every detected entity completely with [REDACTED]. Maximum direct hiding.',
    example: 'rahul.sharma@example.com → [REDACTED]',
  },
  partial_mask: {
    name: 'Mode B — Partial Mask',
    shortName: 'Partial Mask',
    description: 'Preserves minimal non-sensitive structure (last 4 digits or domain) for readability.',
    example: '9876543210 → ******3210',
  },
  pseudonymize: {
    name: 'Mode C — Consistent Pseudonymization',
    shortName: 'Pseudonymize',
    description: 'Replaces repeated identical entities with stable session tokens (EMAIL_01, PHONE_01) in memory only.',
    example: 'rahul@example.com → EMAIL_01',
  },
};
