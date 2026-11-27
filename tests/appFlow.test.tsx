import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('sanitizes Names, Locations, and API Keys by default, updates Redaction Summary, masks secrets in diagnostics, and clears cleanly', async () => {
    render(<App />);

    // Click Customer Support Ticket sample chip
    fireEvent.click(screen.getByRole('button', { name: /customer support ticket/i }));

    await waitFor(() => {
      const output = screen.getByLabelText(/sanitized output text/i);
      expect(output.textContent).toContain('[REDACTED]');
      // Direct PII, API key, Name, and Location are all sanitized by default
      expect(output.textContent).not.toContain('rahul.sharma@example.in');
      expect(output.textContent).not.toContain('sk-proj-synthetic99demoKeyForClearshareTest01');
      expect(output.textContent).not.toContain('Rahul Sharma');
      expect(output.textContent).not.toContain('Pune');
    });

    // Redaction Summary strip shows real counts including API Keys, Names, Locations
    const summary = screen.getByLabelText(/redaction summary/i);
    expect(summary).toHaveTextContent(/Emails/i);
    expect(summary).toHaveTextContent(/API Keys/i);
    expect(summary).toHaveTextContent(/Names/i);
    expect(summary).toHaveTextContent(/Locations/i);

    // Expand Comparison -> check Detected Entities does NOT expose raw API secret
    fireEvent.click(screen.getByRole('button', { name: /expand comparison/i }));
    fireEvent.click(screen.getByRole('button', { name: /detected entities/i }));
    const comparisonPanel = screen.getByLabelText(/expanded comparison and detection details/i);
    expect(comparisonPanel.textContent).not.toContain(
      'sk-proj-synthetic99demoKeyForClearshareTest01'
    );
    expect(comparisonPanel.textContent).toContain('SECRET ••••st01');

    // Clear button at Input Document header resets input, output, summary, and comparison
    fireEvent.click(screen.getByRole('button', { name: /clear workspace/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/sanitized output text/i)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/expanded comparison and detection details/i)
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/redaction summary/i)).toHaveTextContent(/0 items redacted/i);
    });

    // Activity Log contains zero PII or secrets
    fireEvent.click(screen.getByRole('button', { name: /open activity log/i }));
    const dialog = screen.getByRole('dialog', { name: /local activity log/i });
    expect(dialog.textContent).not.toContain('rahul.sharma@example.in');
    expect(dialog.textContent).not.toContain('sk-proj-synthetic99demoKeyForClearshareTest01');
  });

  it('navigates across all 5 primary product areas and escapes HTML/script payloads safely', async () => {
    const { container } = render(<App />);

    // Load HR Resume and test navigation across all 5 areas
    fireEvent.click(screen.getByRole('button', { name: /hr resume/i }));
    await waitFor(() => {
      expect(screen.getByLabelText(/sanitized output text/i)).toBeInTheDocument();
    });

    const nav = screen.getAllByRole('navigation', { name: /primary areas/i })[0];

    fireEvent.click(within(nav).getByRole('button', { name: /document analysis/i }));
    expect(screen.getByRole('heading', { name: /document analysis/i })).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /privacy simulator/i }));
    expect(screen.getByRole('heading', { name: /privacy exposure simulator/i })).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /compare & review/i }));
    expect(
      screen.getByRole('heading', { name: /comparison & residual exposure review/i })
    ).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /verification & reporting/i }));
    expect(
      screen.getByRole('heading', { name: /independent verification & reporting/i })
    ).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /^export$/i }));
    expect(
      screen.getByRole('heading', { name: /export & privacy analysis report/i })
    ).toBeInTheDocument();

    // Return to Workspace and inject HTML/script text -> zero <script> tags executed/rendered
    fireEvent.click(within(nav).getByRole('button', { name: /^workspace$/i }));
    const editor = screen.getByLabelText(/paste sensitive text/i);
    fireEvent.change(editor, {
      target: { value: '<script>alert(1)</script> email test@example.in' },
    });

    await waitFor(() => {
      const output = screen.getByLabelText(/sanitized output text/i);
      expect(output.textContent).toContain('<script>alert(1)</script> email [REDACTED]');
    });
    expect(container.querySelectorAll('script')).toHaveLength(0);
  });
});
