import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from '../src/App';
import { SYNTHETIC_SAMPLES } from '../src/data/syntheticSamples';
import { detectEntities } from '../src/engines/detection/detectEntities';
import { detectContextClues } from '../src/engines/context/detectContextClues';
import { sanitizeText } from '../src/engines/redaction/sanitizeDocument';
import { runExposureSimulation } from '../src/engines/simulation/runExposureSimulation';

describe('CLEARSHARE Redesigned Live Workspace & Pipeline', () => {
  it('processes all three redesigned synthetic samples without leaking direct identifiers', () => {
    for (const sample of SYNTHETIC_SAMPLES) {
      const detection = detectEntities(sample.content);
      const clues = detectContextClues(sample.content);
      expect(detection.entities.length).toBeGreaterThan(0);
      expect(clues.length).toBeGreaterThan(0);

      const redacted = sanitizeText(sample.content, detection.entities, 'full_mask');
      const sim = runExposureSimulation({
        sanitizedText: redacted.sanitizedText,
        mode: 'full_mask',
        originalDirectEntitiesCount: detection.entities.length,
        originalContextCluesCount: clues.length,
        customPhrases: [],
        appliedAdditionalRedactions: [],
      });

      expect(sim.remainingDirectEntities).toHaveLength(0);
      expect(sim.remainingContextClues.length).toBeGreaterThan(0);
      expect(sim.linkabilityFindings.length).toBeGreaterThan(0);
    }
  });

  it('updates sanitized output, Privacy Risk Meter, and expandable comparison automatically on sample load', async () => {
    render(<App />);

    // Click Customer Support Ticket chip directly above editor
    fireEvent.click(screen.getByRole('button', { name: /customer support ticket/i }));

    // Instant live pipeline updates output & Privacy Risk Meter automatically
    await waitFor(() => {
      const output = screen.getByLabelText(/sanitized output text/i);
      expect(output.textContent).toContain('[REDACTED]');
      expect(output.textContent).not.toContain('rahul.sharma@example.in');
    });

    const riskMeter = screen.getByLabelText(/privacy risk meter/i);
    expect(riskMeter).toHaveTextContent(/privacy exposure/i);
    expect(riskMeter).toHaveTextContent(/remaining identifier/i);

    // Switch mode to Pseudonymize -> updates output automatically
    fireEvent.click(screen.getByRole('radio', { name: /pseudonymize/i }));
    await waitFor(() => {
      const output = screen.getByLabelText(/sanitized output text/i);
      expect(output.textContent).toContain('EMAIL_01');
    });

    // Expand Comparison -> renders side-by-side diff and Detected Entities tab
    fireEvent.click(screen.getByRole('button', { name: /expand comparison/i }));
    expect(screen.getByText(/Side-by-Side Comparison/i)).toBeInTheDocument();

    // Open Activity Log and verify no raw PII leaked
    fireEvent.click(screen.getByRole('button', { name: /open activity log/i }));
    const dialog = screen.getByRole('dialog', { name: /local activity log/i });
    expect(dialog.textContent).not.toContain('rahul.sharma@example.in');
    expect(dialog.textContent).not.toContain('ABCDE1234F');
  });
});
