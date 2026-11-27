import { describe, expect, it } from 'vitest';
import { detectEntities } from '../src/engines/detection/detectEntities';
import {
  InMemoryPseudonymRegistry,
  sanitizeText,
} from '../src/engines/redaction/sanitizeDocument';

describe('Sanitization Engine', () => {
  it('applies Mode A Full Mask with [REDACTED]', () => {
    const text = 'Contact rahul@gmail.com or 9876543210 from 192.168.1.45.';
    const { entities } = detectEntities(text);
    const result = sanitizeText(text, entities, 'full_mask');

    expect(result.sanitizedText).toBe(
      'Contact [REDACTED] or [REDACTED] from [REDACTED].'
    );
    expect(result.redactedDirectCount).toBe(3);
  });

  it('applies Mode B Partial Mask with category-appropriate rules', () => {
    const text =
      'Email: saksham@gmail.com | Phone: 9876543210 | PAN: ABCDE1234F | Card: 1234567812345678 | IP: 192.168.1.45 | Aadhaar: 2345 6789 0123';
    const { entities } = detectEntities(text);
    const result = sanitizeText(text, entities, 'partial_mask');

    expect(result.sanitizedText).toContain('s******@gmail.com');
    expect(result.sanitizedText).toContain('******3210');
    expect(result.sanitizedText).toContain('ABCDE****F');
    expect(result.sanitizedText).toContain('XXXX XXXX 5678');
    expect(result.sanitizedText).toContain('xxx.xxx.xxx.45');
    expect(result.sanitizedText).toContain('XXXX XXXX 0123');
  });

  it('applies Mode C Consistent Pseudonymization stably for repeated normalized entities', () => {
    const text =
      'Primary: Rahul@Example.com, Phone: +91 98765-43210. Again: rahul@example.com and 9876543210. Second user: meera@example.com.';
    const { entities } = detectEntities(text);
    const registry = new InMemoryPseudonymRegistry();
    const result = sanitizeText(text, entities, 'pseudonymize', [], registry);

    expect(result.sanitizedText).toBe(
      'Primary: EMAIL_01, Phone: PHONE_01. Again: EMAIL_01 and PHONE_01. Second user: EMAIL_02.'
    );
    expect(registry.size).toBe(3);
  });
});
