import { describe, expect, it } from 'vitest';
import { detectEntities } from '../src/engines/detection/detectEntities';
import { detectContextClues } from '../src/engines/context/detectContextClues';
import { isValidIPv4, isValidLuhn } from '../src/engines/detection/validators';

describe('Detection Engine', () => {
  it('detects valid emails and ignores incomplete fragments', () => {
    const sample =
      'Reach out to Rahul.Sharma+billing@example.in or ops@sub.domain.org. Ignore bad@ and @missing.com and a..b@test.com.';
    const { entities } = detectEntities(sample);
    const emails = entities.filter((e) => e.category === 'EMAIL');

    expect(emails).toHaveLength(2);
    expect(emails[0].normalizedValue).toBe('rahul.sharma+billing@example.in');
    expect(emails[1].normalizedValue).toBe('ops@sub.domain.org');
  });

  it('detects Indian phone numbers with +91, 91, spaces, hyphens, and parentheses and normalizes duplicates', () => {
    const sample =
      'Call +91 98765-43210, or 91 9876543210, or (+91) 98765 43210, or 9811122334. Ignore 1234567890.';
    const { entities, uniqueCountsByCategory } = detectEntities(sample);
    const phones = entities.filter((e) => e.category === 'PHONE');

    expect(phones).toHaveLength(4);
    expect(phones[0].normalizedValue).toBe('+919876543210');
    expect(phones[1].normalizedValue).toBe('+919876543210');
    expect(phones[2].normalizedValue).toBe('+919876543210');
    expect(phones[3].normalizedValue).toBe('+919811122334');
    expect(uniqueCountsByCategory.PHONE).toBe(2);
  });

  it('validates IPv4 octets strictly between 0 and 255', () => {
    expect(isValidIPv4('192.168.1.45')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
    expect(isValidIPv4('999.168.1.40')).toBe(false);
    expect(isValidIPv4('192.168.01.5')).toBe(false);

    const sample = 'Valid 10.24.88.19 and invalid 256.10.1.1 and 192.168.01.5.';
    const { entities, warnings } = detectEntities(sample);
    const ips = entities.filter((e) => e.category === 'IPV4');

    expect(ips).toHaveLength(1);
    expect(ips[0].rawValue).toBe('10.24.88.19');
    expect(warnings.some((w) => w.category === 'IPV4')).toBe(true);
  });

  it('detects Indian PAN format and distinguishes standard holder category letters', () => {
    const sample = 'Standard PAN ABCPK1234F and example shape ABCDE1234F.';
    const { entities } = detectEntities(sample);
    const pans = entities.filter((e) => e.category === 'PAN');

    expect(pans).toHaveLength(2);
    expect(pans[0].status).toBe('format_only');
    expect(pans[1].status).toBe('uncertain');
    expect(pans[0].statusNote).toContain('does not establish government-issued validity');
  });

  it('detects Aadhaar-like 12-digit numbers without overlapping 16-digit card numbers', () => {
    const sample = 'Aadhaar-like 2345 6789 0123 and card 4532 0151 1283 0366.';
    const { entities } = detectEntities(sample);

    const aadhaars = entities.filter((e) => e.category === 'AADHAAR');
    const cards = entities.filter((e) => e.category === 'CARD');

    expect(aadhaars).toHaveLength(1);
    expect(aadhaars[0].normalizedValue).toBe('234567890123');
    expect(cards).toHaveLength(1);
    expect(cards[0].normalizedValue).toBe('4532015112830366');
  });

  it('separates valid Luhn cards from invalid checksum card candidates', () => {
    expect(isValidLuhn('4532015112830366')).toBe(true);
    expect(isValidLuhn('4532015112830367')).toBe(false);

    const sample = 'Card A: 4532 0151 1283 0366 | Card B: 4532 0151 1283 0367';
    const { entities } = detectEntities(sample);
    const cards = entities.filter((e) => e.category === 'CARD');

    expect(cards).toHaveLength(2);
    expect(cards[0].status).toBe('valid');
    expect(cards[1].status).toBe('invalid_checksum');
  });

  it('preserves exact character offsets for slicing original text', () => {
    const sample = 'User rahul@example.com logged in from 192.168.1.45.';
    const { entities } = detectEntities(sample);

    for (const entity of entities) {
      expect(sample.slice(entity.start, entity.end)).toBe(entity.rawValue);
    }
  });

  it('detects OpenAI, AWS, GitHub, Google, Stripe, Slack, Bearer, and assignment secrets while ignoring short/placeholder strings', () => {
    // Assemble synthetic test tokens dynamically so static secret scanners do not treat fixtures as live credentials
    const openAiFake = ['sk', 'proj', 'abc1234567890xyz9876543210'].join('-');
    const awsFake = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const ghFake = ['ghp', '1234567890abcdef1234567890abcdef1234'].join('_');
    const googleFake = ['AIza', 'SyDaGmWKa4JsXZ-HjGw7ISLn_3namBGt123'].join('');
    const stripeFake = ['sk', 'test', '51N9xAbC1234567890xyzABC'].join('_');
    const slackFake = ['xoxb', '123456789012', '1234567890123', 'AbCdEfGhIjKlMnOpQrStUvWx'].join('-');

    const sample = [
      `OpenAI: ${openAiFake}`,
      `AWS: ${awsFake}`,
      `GitHub: ${ghFake}`,
      `Google: ${googleFake}`,
      `Stripe: ${stripeFake}`,
      `Slack: ${slackFake}`,
      'Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload123',
      'Config: api_key="live_9876543210abcdef_secret" secret=topSecretToken_99887766 access_token=tok_AB12CD34EF56GH78',
      'Ignore false positives: sk-short, AKIA123, api_key=your_api_key_here, secret=password',
    ].join('\n');

    const { entities } = detectEntities(sample);
    const secrets = entities.filter((e) => e.category === 'API_KEY');
    const phones = entities.filter((e) => e.category === 'PHONE');

    expect(secrets).toHaveLength(10);
    expect(phones).toHaveLength(0);
  });

  it('detects contextual names and curated locations without false positives on generic headings', () => {
    const hrText = 'Candidate: Meera Nair\nLocation: Kochi, Kerala\nTitle: Software Bug Report';
    const supportText = 'Customer: Rahul Sharma\nRahul Sharma from Pune reported an issue.';
    const jsonText = '{\n  "customer": "Meera Nair",\n  "location": "Kochi"\n}';

    const hrClues = detectContextClues(hrText);
    const supportClues = detectContextClues(supportText);
    const jsonClues = detectContextClues(jsonText);

    expect(hrClues.filter((c) => c.category === 'PERSON_NAME').map((c) => c.value)).toEqual([
      'Meera Nair',
    ]);
    expect(hrClues.filter((c) => c.category === 'LOCATION').map((c) => c.value)).toEqual([
      'Kochi',
      'Kerala',
    ]);
    expect(hrClues.some((c) => c.value === 'Software Bug')).toBe(false);

    expect(
      supportClues.filter((c) => c.category === 'PERSON_NAME').map((c) => c.value)
    ).toEqual(['Rahul Sharma', 'Rahul Sharma']);
    expect(supportClues.filter((c) => c.category === 'LOCATION').map((c) => c.value)).toEqual([
      'Pune',
    ]);

    expect(jsonClues.filter((c) => c.category === 'PERSON_NAME').map((c) => c.value)).toEqual([
      'Meera Nair',
    ]);
    expect(jsonClues.filter((c) => c.category === 'LOCATION').map((c) => c.value)).toEqual([
      'Kochi',
    ]);
  });
});
