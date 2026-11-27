import { describe, expect, it } from 'vitest';
import { detectEntities } from '../src/engines/detection/detectEntities';
import { detectContextClues } from '../src/engines/context/detectContextClues';
import { sanitizeText } from '../src/engines/redaction/sanitizeDocument';
import { runExposureSimulation } from '../src/engines/simulation/runExposureSimulation';

describe('Context Intelligence & Privacy Exposure Simulator', () => {
  it('identifies indirect clues and linkability even after direct PII is fully masked', () => {
    const original =
      'Rahul Sharma from Pune reported a payment issue on 12 October 2026. Contact rahul@example.com. His account reference is TKT-48291.';

    const direct = detectEntities(original);
    const initialClues = detectContextClues(original);
    const sanitized = sanitizeText(original, direct.entities, 'full_mask');

    expect(sanitized.sanitizedText).not.toContain('rahul@example.com');

    const sim = runExposureSimulation({
      sanitizedText: sanitized.sanitizedText,
      mode: 'full_mask',
      originalDirectEntitiesCount: direct.entities.length,
      originalContextCluesCount: initialClues.length,
      customPhrases: [],
      appliedAdditionalRedactions: [],
    });

    expect(sim.remainingDirectEntities).toHaveLength(0);
    expect(sim.remainingContextClues.some((c) => c.category === 'LOCATION')).toBe(true);
    expect(sim.remainingContextClues.some((c) => c.category === 'DATE')).toBe(true);
    expect(sim.remainingContextClues.some((c) => c.category === 'TICKET_REF')).toBe(true);
    expect(sim.linkabilityFindings.length).toBeGreaterThanOrEqual(2);
    expect(['Moderate', 'High']).toContain(sim.level);
  });

  it('shows exposure reduction when recommended indirect clues are redacted and re-simulated', () => {
    const original =
      'Rahul Sharma from Pune reported a payment issue on 12 October 2026 under TKT-48291. Email: rahul@example.com.';
    const direct = detectEntities(original);
    const clues = detectContextClues(original);

    const firstPass = sanitizeText(original, direct.entities, 'full_mask');
    const firstSim = runExposureSimulation({
      sanitizedText: firstPass.sanitizedText,
      mode: 'full_mask',
      originalDirectEntitiesCount: direct.entities.length,
      originalContextCluesCount: clues.length,
      customPhrases: [],
      appliedAdditionalRedactions: [],
    });

    const secondPass = sanitizeText(original, direct.entities, 'full_mask', clues);
    const secondSim = runExposureSimulation({
      sanitizedText: secondPass.sanitizedText,
      mode: 'full_mask',
      originalDirectEntitiesCount: direct.entities.length,
      originalContextCluesCount: clues.length,
      customPhrases: [],
      appliedAdditionalRedactions: clues.map((c) => c.value),
    });

    expect(secondSim.scorePoints).toBeLessThan(firstSim.scorePoints);
    expect(secondSim.level).toBe('Low');
    expect(secondSim.remainingContextClues).toHaveLength(0);
  });
});
