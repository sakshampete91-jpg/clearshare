import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from '../src/App';
import { SYNTHETIC_SAMPLES } from '../src/data/syntheticSamples';
import { detectEntities } from '../src/engines/detection/detectEntities';
import { detectContextClues } from '../src/engines/context/detectContextClues';
import { sanitizeText } from '../src/engines/redaction/sanitizeDocument';
import { runExposureSimulation } from '../src/engines/simulation/runExposureSimulation';
import { processCsvDocument } from '../src/engines/export/csvProcessor';

describe('CLEARSHARE Synthetic Samples & Full UI Flow', () => {
  it('processes all three synthetic samples end-to-end without leaking direct identifiers', () => {
    for (const sample of SYNTHETIC_SAMPLES) {
      if (sample.format === 'csv') {
        const csvRes = processCsvDocument(sample.content, 'full_mask');
        expect(csvRes.structureVerified).toBe(true);
        expect(csvRes.entities.length).toBeGreaterThan(0);

        const sim = runExposureSimulation({
          sanitizedText: csvRes.sanitizedCsvText,
          mode: 'full_mask',
          originalDirectEntitiesCount: csvRes.entities.length,
          originalContextCluesCount: csvRes.contextClues.length,
          customPhrases: [],
          appliedAdditionalRedactions: [],
        });
        expect(sim.remainingDirectEntities).toHaveLength(0);
      } else {
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
    }
  });

  it('navigates through Workspace -> Analysis -> Simulator -> Comparison -> Export without PII in activity log', () => {
    render(<App />);

    // Load Sample 1 (Customer Support Ticket)
    fireEvent.click(screen.getByRole('button', { name: /customer support ticket/i }));

    // Start Analysis
    fireEvent.click(screen.getByRole('button', { name: /start analysis/i }));
    expect(screen.getByText(/Document Analysis Studio/i)).toBeInTheDocument();

    // Navigate to Exposure Simulator
    fireEvent.click(screen.getByRole('button', { name: /simulate privacy exposure/i }));
    expect(screen.getByText(/What Your Sanitized Document Still Reveals/i)).toBeInTheDocument();

    // Toggle a recommendation and re-run simulation
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByRole('button', { name: /apply selected/i }));
    expect(screen.getByText(/Run #2/i)).toBeInTheDocument();

    // Navigate to Comparison Studio
    fireEvent.click(screen.getByRole('button', { name: /compare side-by-side/i }));
    expect(screen.getByText(/Side-by-Side Comparison Studio/i)).toBeInTheDocument();

    // Navigate to Review & Export
    fireEvent.click(screen.getByRole('button', { name: /^review & export$/i }));
    expect(screen.getByText(/Review & Safe Export/i)).toBeInTheDocument();

    // Open Activity Log and confirm no raw PII leaked into it
    fireEvent.click(screen.getByRole('button', { name: /open activity log/i }));
    const dialog = screen.getByRole('dialog', { name: /local activity log/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).not.toContain('rahul.sharma@example.in');
    expect(dialog.textContent).not.toContain('ABCDE1234F');
    expect(dialog.textContent).not.toContain('4532 0151 1283 0366');
  });
});
