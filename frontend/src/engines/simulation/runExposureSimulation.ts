import type {
  ContextClue,
  DetectedEntity,
  ExposureLevel,
  ExposureSimulationResult,
  LinkabilityFinding,
  RecommendationItem,
  SanitizationMode,
} from '../../types/clearshare';
import { detectEntities } from '../detection/detectEntities';
import { detectContextClues } from '../context/detectContextClues';

export interface SimulationInput {
  sanitizedText: string;
  mode: SanitizationMode;
  originalDirectEntitiesCount: number;
  originalContextCluesCount: number;
  customPhrases: string[];
  appliedAdditionalRedactions: string[];
}

function uniqueByNormalized<T extends { normalizedValue: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.normalizedValue)) continue;
    seen.add(item.normalizedValue);
    out.push(item);
  }
  return out;
}

function buildLinkabilityFindings(
  remainingDirect: DetectedEntity[],
  remainingClues: ContextClue[]
): LinkabilityFinding[] {
  const findings: LinkabilityFinding[] = [];
  const byCat = new Map<string, ContextClue[]>();

  for (const clue of remainingClues) {
    const arr = byCat.get(clue.category) ?? [];
    arr.push(clue);
    byCat.set(clue.category, arr);
  }

  const locations = uniqueByNormalized(byCat.get('LOCATION') ?? []);
  const dates = uniqueByNormalized(byCat.get('DATE') ?? []);
  const tickets = uniqueByNormalized(byCat.get('TICKET_REF') ?? []);
  const accounts = uniqueByNormalized(byCat.get('ACCOUNT_REF') ?? []);
  const orgs = uniqueByNormalized(byCat.get('ORGANIZATION') ?? []);
  const persons = uniqueByNormalized(byCat.get('PERSON_NAME') ?? []);
  const uncertain = uniqueByNormalized(byCat.get('UNCERTAIN') ?? []);
  const repeatedIds = uniqueByNormalized(byCat.get('REPEATED_ID') ?? []);

  if (remainingDirect.length > 0 && remainingClues.length > 0) {
    findings.push({
      id: 'link-direct-context',
      title: 'Unmasked Direct Identifier + Contextual Clues',
      cluesInvolved: [
        ...remainingDirect.slice(0, 2).map((d) => `${d.category}: ${d.rawValue}`),
        ...remainingClues.slice(0, 2).map((c) => c.value),
      ],
      whyItMatters:
        'Unmasked direct identifiers remain alongside contextual details, making record matching straightforward for recipients.',
      potentialInference:
        'A recipient could potentially correlate the remaining identifier with the surrounding timeline or organization.',
      recommendation: 'Verify why direct identifiers remained and apply Full Mask or Pseudonymization.',
      severity: 'high',
    });
  }

  if (locations.length > 0 && dates.length > 0) {
    findings.push({
      id: 'link-loc-date',
      title: 'Location + Specific Date Combination',
      cluesInvolved: [locations[0].value, dates[0].value],
      whyItMatters:
        'Knowing both the city/branch and exact date narrows an incident or visit down to a small window of activity.',
      potentialInference:
        'Potential linkability to attendance logs, support shifts, or regional transaction batches from that day.',
      recommendation: `Redact or generalize "${locations[0].value}" (e.g., to country/region) and generalize "${dates[0].value}" to month/year.`,
      severity: 'moderate',
    });
  }

  if (tickets.length > 0 || accounts.length > 0) {
    const refs = [...tickets, ...accounts].slice(0, 3).map((r) => r.value);
    findings.push({
      id: 'link-unique-ref',
      title: 'Unique Ticket or Account Reference + Context',
      cluesInvolved: refs,
      whyItMatters:
        'Even after names, emails, and phones are masked, a unique ticket or account ID acts as a direct join key for anyone with internal system access.',
      potentialInference:
        'Potential linkability back to the full customer profile, payment history, or audit trail in ticketing/CRM tools.',
      recommendation: `Redact reference IDs (${refs.join(', ')}) before sharing externally.`,
      severity: 'high',
    });
  }

  if (persons.length > 0 && (orgs.length > 0 || locations.length > 0)) {
    const pair = [persons[0].value, orgs[0]?.value ?? locations[0]?.value].filter(Boolean) as string[];
    findings.push({
      id: 'link-person-org',
      title: 'Person Name + Organization or Location',
      cluesInvolved: pair,
      whyItMatters:
        'A person name paired with a workplace or city remains strongly distinguishing even when contact details are hidden.',
      potentialInference:
        'Potential linkability to public profiles, directories, or team rosters.',
      recommendation: `Redact person name "${persons[0].value}" and consider masking "${orgs[0]?.value ?? locations[0]?.value}".`,
      severity: 'high',
    });
  }

  if (orgs.length > 0 && (uncertain.length > 0 || dates.length > 0)) {
    const partner = uncertain[0]?.value ?? dates[0]?.value;
    findings.push({
      id: 'link-org-role',
      title: 'Organization + Role or Event Date',
      cluesInvolved: [orgs[0].value, partner],
      whyItMatters:
        'Specific job titles or dated incidents inside a named organization often apply to only one or two people.',
      potentialInference:
        'Could potentially narrow the subject down to a specific team member or role holder.',
      recommendation: `Generalize the role/date ("${partner}") or redact the organization name ("${orgs[0].value}").`,
      severity: 'moderate',
    });
  }

  if (repeatedIds.length > 0) {
    findings.push({
      id: 'link-repeated-id',
      title: 'Repeated Unmasked Reference Across Document',
      cluesInvolved: repeatedIds.map((r) => r.value),
      whyItMatters:
        'Repeated identifiers allow separate paragraphs or rows in a file to be linked together as belonging to the same event or subject.',
      potentialInference:
        'Potential correlation across records, magnifying the effect of individual indirect clues.',
      recommendation: `Redact repeated identifier "${repeatedIds[0].value}".`,
      severity: 'moderate',
    });
  }

  return findings;
}

export function runExposureSimulation(input: SimulationInput): ExposureSimulationResult {
  // Independent second scan strictly against the ALREADY SANITIZED document
  const postDirect = detectEntities(input.sanitizedText);
  const postClues = detectContextClues(input.sanitizedText, input.customPhrases);

  const remainingDirectEntities = postDirect.entities;
  const remainingContextClues = postClues;
  const linkabilityFindings = buildLinkabilityFindings(
    remainingDirectEntities,
    remainingContextClues
  );

  // Build unresolved findings list honestly
  const unresolvedFindings: string[] = [];
  if (remainingDirectEntities.length > 0) {
    unresolvedFindings.push(
      `${remainingDirectEntities.length} direct identifier(s) still appear unmasked in the sanitized output.`
    );
  }
  if (input.mode === 'partial_mask' && input.originalDirectEntitiesCount > 0) {
    unresolvedFindings.push(
      'Partial Masking keeps trailing digits, PAN prefixes, or email domains visible, which preserves partial identifying structure.'
    );
  }
  const uncertainCount = remainingContextClues.filter((c) => c.confidence === 'uncertain').length;
  if (uncertainCount > 0) {
    unresolvedFindings.push(
      `${uncertainCount} uncertain contextual clue(s) (such as specific job titles) remain; review manually to decide if they narrow identity.`
    );
  }
  if (remainingContextClues.length > 0) {
    unresolvedFindings.push(
      `${remainingContextClues.length} indirect contextual clue(s) remain after direct identifier sanitization.`
    );
  }

  // Transparent rule-based exposure scoring
  const reasons: string[] = [];
  let scorePoints = 0;

  if (remainingDirectEntities.length > 0) {
    const pts = remainingDirectEntities.length * 35;
    scorePoints += pts;
    reasons.push(
      `+${pts} pts: ${remainingDirectEntities.length} unmasked direct identifier(s) detected in sanitized text.`
    );
  } else {
    reasons.push('+0 pts: No unmasked direct identifiers detected in sanitized text.');
  }

  const highLinks = linkabilityFindings.filter((f) => f.severity === 'high');
  const modLinks = linkabilityFindings.filter((f) => f.severity === 'moderate');
  if (highLinks.length > 0) {
    const pts = highLinks.length * 25;
    scorePoints += pts;
    reasons.push(`+${pts} pts: ${highLinks.length} high-risk linkable clue combination(s).`);
  }
  if (modLinks.length > 0) {
    const pts = modLinks.length * 15;
    scorePoints += pts;
    reasons.push(`+${pts} pts: ${modLinks.length} moderate-risk linkable clue combination(s).`);
  }

  const confidentClues = remainingContextClues.filter((c) => c.confidence !== 'uncertain');
  if (confidentClues.length > 0) {
    const pts = confidentClues.length * 8;
    scorePoints += pts;
    reasons.push(`+${pts} pts: ${confidentClues.length} remaining indirect clue(s) (dates, locations, orgs, or IDs).`);
  }
  if (uncertainCount > 0) {
    const pts = uncertainCount * 3;
    scorePoints += pts;
    reasons.push(`+${pts} pts: ${uncertainCount} uncertain contextual phrase(s).`);
  }

  if (input.mode === 'partial_mask' && input.originalDirectEntitiesCount > 0) {
    scorePoints += 10;
    reasons.push('+10 pts: Partial Mask mode retains partial fragments (domains / last 4 digits).');
  }

  let level: ExposureLevel = 'Low';
  if (remainingDirectEntities.length > 0 || scorePoints >= 55) {
    level = 'High';
  } else if (scorePoints >= 25) {
    level = 'Moderate';
  }

  // Recommendations for remaining unique clues
  const uniqueRemainingClues = uniqueByNormalized(remainingContextClues);
  const recommendations: RecommendationItem[] = uniqueRemainingClues.map((clue, idx) => ({
    id: `rec-${idx}-${clue.category}`,
    label: `Redact ${clue.category.replace('_', ' ').toLowerCase()}: "${clue.value}"`,
    description: clue.reason,
    targetType: 'context_clue',
    targetValue: clue.value,
    category: clue.category,
    applied: input.appliedAdditionalRedactions.some(
      (v) => v.toLowerCase() === clue.value.toLowerCase()
    ),
  }));

  // Coverage stats
  const totalOriginalFindings =
    input.originalDirectEntitiesCount + input.originalContextCluesCount;
  const remainingCount = remainingDirectEntities.length + remainingContextClues.length;
  const redactedCount = Math.max(0, totalOriginalFindings - remainingCount);
  const redactionCoveragePercent =
    totalOriginalFindings === 0
      ? 100
      : Math.round((redactedCount / totalOriginalFindings) * 100);

  return {
    level,
    scorePoints,
    reasons,
    remainingDirectEntities,
    remainingContextClues,
    linkabilityFindings,
    unresolvedFindings,
    recommendations,
    redactionCoveragePercent,
    totalOriginalFindings,
    redactedCount,
    remainingCount,
  };
}
