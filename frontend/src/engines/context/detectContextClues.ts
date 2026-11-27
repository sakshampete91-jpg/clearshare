import type { ContextClue, ContextClueCategory } from '../../types/clearshare';

const KNOWN_LOCATIONS = [
  'Pune',
  'Mumbai',
  'Bengaluru',
  'Bangalore',
  'Delhi',
  'New Delhi',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Kochi',
  'Ahmedabad',
  'Jaipur',
  'Gurugram',
  'Gurgaon',
  'Noida',
  'Chandigarh',
  'Lucknow',
  'Surat',
  'Nagpur',
  'Indore',
  'Thane',
  'Coimbatore',
  'Visakhapatnam',
  'Patna',
  'Bhopal',
  'Vadodara',
  'Madurai',
  'Nashik',
  'Faridabad',
  'Goa',
  'Maharashtra',
  'Karnataka',
  'Telangana',
  'Tamil Nadu',
  'Kerala',
  'Gujarat',
  'Rajasthan',
  'West Bengal',
  'Uttar Pradesh',
  'Andhra Pradesh',
  'India',
  'Singapore',
  'London',
  'New York',
  'San Francisco',
];

const PLACEHOLDER_IGNORE_REGEX =
  /^(\[REDACTED[^\]]*\]|EMAIL_\d+|PHONE_\d+|IP_\d+|PAN_\d+|AADHAAR_\d+|CARD_\d+|PERSON_\d+|LOCATION_\d+|DATE_\d+|ORG_\d+|TICKET_\d+|ACCOUNT_\d+|ID_\d+|PHRASE_\d+|CLUE_\d+|XXXX)$/i;

const MONTH_DATE_REGEX =
  /\b(?:\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(?:19|20)\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d{2})\b/g;

const NUMERIC_DATE_REGEX =
  /\b(?:(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[-/](?:0?[1-9]|1[0-2])[-/](?:19|20)\d{2})\b/g;

const TICKET_REF_REGEX =
  /\b(?:TKT|INC|REQ|CASE|SR|JIRA|BUG)-\d{3,8}\b/g;

const ACCOUNT_REF_REGEX =
  /\b(?:ACCT|ACC|CUST|POL|ORD|INV|REF)-\d{3,10}\b/g;

const ORG_SUFFIX_REGEX =
  /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,4}\s+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|Ltd\.?|Limited|Inc\.?|LLC|LLP|Corp\.?|Technologies|Systems|Labs|Payments|FinTech|Solutions|Bank))\b/g;

const LABELED_ORG_REGEX =
  /(?:Organization|Team\s*\/\s*Organization|Company|Employer)\s*:\s*([A-Z][^\n,;]{2,60})/g;

const LABELED_PERSON_REGEX =
  /"?(?:Customer|Reporter|Candidate(?:[ \t]+Name)?|Applicant|Employee|Patient|Client|Name|Author|Doctor|Physician|Contact|Mr\.|Ms\.|Mrs\.|Dr\.)"?[ \t]*[: \t]+[ \t]*"?([A-Z][a-z]{1,20}(?:[ \t]+[A-Z][a-z]{1,20}){1,2})\b/gi;

const ACTION_PERSON_REGEX =
  /\b([A-Z][a-z]{1,20}[ \t]+[A-Z][a-z]{1,20})[ \t]+(?:from|visited|reported|joined|submitted|requested|is[ \t]+the)\b/g;

const ROLE_OR_TITLE_REGEX =
  /\b(?:Principal|Senior|Lead|Chief|Head[ \t]+of|Director[ \t]+of|VP[ \t]+of)[ \t]+[A-Z][A-Za-z]+(?:[ \t]+[A-Z][A-Za-z]+){0,3}\b/g;

const GENERIC_ID_REGEX = /\b[A-Z]{2,8}-\d{3,10}\b/g;

const NON_PERSON_STARTERS = new Set([
  'Subject',
  'Customer',
  'Incident',
  'Verification',
  'Primary',
  'Fallback',
  'Merchant',
  'Support',
  'Client',
  'Software',
  'Privacy',
  'Senior',
  'Principal',
  'Lead',
  'Account',
  'Ticket',
  'Organization',
  'Bug',
  'Medical',
  'Clinical',
  'Human',
  'System',
  'Database',
  'Server',
  'Network',
  'Project',
  'Direct',
  'Unknown',
  'Not',
  'General',
  'CareBridge',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveClueOverlaps(clues: ContextClue[]): ContextClue[] {
  const categoryWeight: Record<ContextClueCategory, number> = {
    CUSTOM_PHRASE: 9,
    TICKET_REF: 8,
    ACCOUNT_REF: 8,
    DATE: 7,
    ORGANIZATION: 6,
    LOCATION: 5,
    PERSON_NAME: 4,
    REPEATED_ID: 3,
    UNCERTAIN: 1,
  };

  const sorted = [...clues].sort((a, b) => {
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return categoryWeight[b.category] - categoryWeight[a.category];
  });

  const accepted: ContextClue[] = [];
  for (const clue of sorted) {
    if (PLACEHOLDER_IGNORE_REGEX.test(clue.value.trim())) continue;
    const overlaps = accepted.some(
      (existing) => clue.start < existing.end && existing.start < clue.end
    );
    if (!overlaps) accepted.push(clue);
  }

  return accepted.sort((a, b) => a.start - b.start);
}

export function detectContextClues(
  text: string,
  customPhrases: string[] = []
): ContextClue[] {
  if (!text.trim()) return [];

  const candidates: ContextClue[] = [];
  let seq = 0;
  const nextId = () => `clue-${++seq}`;

  // 1. Custom user-defined sensitive phrases
  for (const phrase of customPhrases) {
    const trimmed = phrase.trim();
    if (!trimmed) continue;
    const regex = new RegExp(escapeRegex(trimmed), 'gi');
    for (const match of text.matchAll(regex)) {
      const value = match[0];
      const start = match.index ?? 0;
      candidates.push({
        id: nextId(),
        category: 'CUSTOM_PHRASE',
        value,
        normalizedValue: value.toLowerCase(),
        start,
        end: start + value.length,
        confidence: 'high',
        reason: 'Matches a custom sensitive phrase specified by you.',
      });
    }
  }

  // 2. Ticket references
  for (const match of text.matchAll(TICKET_REF_REGEX)) {
    const value = match[0];
    const start = match.index ?? 0;
    candidates.push({
      id: nextId(),
      category: 'TICKET_REF',
      value,
      normalizedValue: value.toUpperCase(),
      start,
      end: start + value.length,
      confidence: 'high',
      reason: 'Unique support/incident ticket reference that can link directly back to internal logs.',
    });
  }

  // 3. Account references
  for (const match of text.matchAll(ACCOUNT_REF_REGEX)) {
    const value = match[0];
    const start = match.index ?? 0;
    candidates.push({
      id: nextId(),
      category: 'ACCOUNT_REF',
      value,
      normalizedValue: value.toUpperCase(),
      start,
      end: start + value.length,
      confidence: 'high',
      reason: 'Account or customer reference ID that can map back to a specific record.',
    });
  }

  // 4. Specific Dates
  for (const regex of [MONTH_DATE_REGEX, NUMERIC_DATE_REGEX]) {
    for (const match of text.matchAll(regex)) {
      const value = match[0];
      const start = match.index ?? 0;
      candidates.push({
        id: nextId(),
        category: 'DATE',
        value,
        normalizedValue: value.toLowerCase(),
        start,
        end: start + value.length,
        confidence: 'high',
        reason: 'Exact calendar date narrows down when an event or transaction occurred.',
      });
    }
  }

  // 5. Organizations (suffix & labeled)
  for (const match of text.matchAll(ORG_SUFFIX_REGEX)) {
    const value = match[1].trim();
    const start = (match.index ?? 0) + match[0].indexOf(value);
    candidates.push({
      id: nextId(),
      category: 'ORGANIZATION',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end: start + value.length,
      confidence: 'high',
      reason: 'Organization name narrows context to a specific company or team.',
    });
  }

  for (const match of text.matchAll(LABELED_ORG_REGEX)) {
    const rawGroup = match[1].trim();
    // Stop before comma if location follows (e.g. "CloudStack Labs, Bengaluru")
    const orgPart = rawGroup.split(',')[0].trim();
    if (orgPart.length < 2) continue;
    const start = (match.index ?? 0) + match[0].indexOf(orgPart);
    candidates.push({
      id: nextId(),
      category: 'ORGANIZATION',
      value: orgPart,
      normalizedValue: orgPart.toLowerCase(),
      start,
      end: start + orgPart.length,
      confidence: 'moderate',
      reason: 'Appears in an Organization/Company field label.',
    });
  }

  // 6. Locations (known cities/regions)
  const locationPattern = new RegExp(
    `\\b(${KNOWN_LOCATIONS.map(escapeRegex).join('|')})\\b`,
    'g'
  );
  for (const match of text.matchAll(locationPattern)) {
    const value = match[1];
    const start = match.index ?? 0;
    candidates.push({
      id: nextId(),
      category: 'LOCATION',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end: start + value.length,
      confidence: 'high',
      reason: 'Geographic city or region narrows the pool of matching records.',
    });
  }

  // 7. Person Names (contextual deterministic patterns)
  const confirmedPersonNames = new Set<string>();

  for (const match of text.matchAll(LABELED_PERSON_REGEX)) {
    const value = match[1].trim();
    // Ensure captured name itself is Title Case (even though label match is case-insensitive for JSON keys)
    if (!/^[A-Z][a-z]{1,20}(?:[ \t]+[A-Z][a-z]{1,20}){1,2}$/.test(value)) continue;
    const firstWord = value.split(/\s+/)[0];
    if (NON_PERSON_STARTERS.has(firstWord)) continue;
    if (KNOWN_LOCATIONS.includes(value)) continue;
    const start = (match.index ?? 0) + match[0].indexOf(value);
    confirmedPersonNames.add(value);
    candidates.push({
      id: nextId(),
      category: 'PERSON_NAME',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end: start + value.length,
      confidence: 'moderate',
      reason: 'Capitalized name following an explicit person label or title.',
    });
  }

  for (const match of text.matchAll(ACTION_PERSON_REGEX)) {
    const value = match[1].trim();
    const firstWord = value.split(/\s+/)[0];
    if (NON_PERSON_STARTERS.has(firstWord)) continue;
    if (KNOWN_LOCATIONS.includes(value)) continue;
    const start = (match.index ?? 0) + match[0].indexOf(value);
    confirmedPersonNames.add(value);
    candidates.push({
      id: nextId(),
      category: 'PERSON_NAME',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end: start + value.length,
      confidence: 'moderate',
      reason: 'Capitalized two-word phrase preceding a person-action verb (e.g., "reported", "visited").',
    });
  }

  // Catch repeated occurrences of any confirmed name elsewhere in the same document
  for (const name of confirmedPersonNames) {
    const nameRegex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g');
    for (const match of text.matchAll(nameRegex)) {
      const start = match.index ?? 0;
      candidates.push({
        id: nextId(),
        category: 'PERSON_NAME',
        value: name,
        normalizedValue: name.toLowerCase(),
        start,
        end: start + name.length,
        confidence: 'moderate',
        reason: 'Repeated occurrence of a contextually detected person name in this document.',
      });
    }
  }

  // 8. Specific rare job titles -> labeled as UNCERTAIN contextual clue (honest non-AI classification)
  for (const match of text.matchAll(ROLE_OR_TITLE_REGEX)) {
    const value = match[0].trim();
    const start = match.index ?? 0;
    candidates.push({
      id: nextId(),
      category: 'UNCERTAIN',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end: start + value.length,
      confidence: 'uncertain',
      reason: 'Specific job title or seniority phrase (uncertain clue: could narrow down an individual inside an organization).',
    });
  }

  // 9. Repeated generic IDs not already caught as ticket/account refs
  const genericIdCounts = new Map<string, Array<{ value: string; start: number }>>();
  for (const match of text.matchAll(GENERIC_ID_REGEX)) {
    const value = match[0];
    const start = match.index ?? 0;
    const norm = value.toUpperCase();
    const list = genericIdCounts.get(norm) ?? [];
    list.push({ value, start });
    genericIdCounts.set(norm, list);
  }

  for (const [norm, occurrences] of genericIdCounts.entries()) {
    if (occurrences.length >= 2) {
      for (const occ of occurrences) {
        candidates.push({
          id: nextId(),
          category: 'REPEATED_ID',
          value: occ.value,
          normalizedValue: norm,
          start: occ.start,
          end: occ.start + occ.value.length,
          confidence: 'moderate',
          reason: `Identifier repeats ${occurrences.length} times, allowing records or events to be correlated.`,
        });
      }
    }
  }

  return resolveClueOverlaps(candidates);
}
