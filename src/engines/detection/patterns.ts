export const EMAIL_REGEX =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;

// Matches optional +91 / 91 / (+91) prefix followed by 10 digits with optional spaces or hyphens
export const INDIAN_PHONE_REGEX =
  /(?:\(?\+?91\)?[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\(?\+?91\)?[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;

// Matches dotted-quad IPv4-shaped strings (validated strictly per octet afterwards)
export const IPV4_CANDIDATE_REGEX = /\d{1,3}(?:\.\d{1,3}){3}/g;

// Matches 10-character Indian PAN-shaped strings
export const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

// Matches 12-digit Aadhaar-like candidates (contiguous or 4-4-4 separated by space/hyphen)
export const AADHAAR_CANDIDATE_REGEX =
  /\d{4}[\s-]\d{4}[\s-]\d{4}|\d{12}/g;

// Matches 13-19 digit payment card candidates (grouped 4-4-4-x, Amex 4-6-5, or contiguous)
export const CARD_CANDIDATE_REGEX =
  /(?:\d{4}[\s-]?){3}\d{1,7}|\d{4}[\s-]\d{6}[\s-]\d{5}|\d{13,19}/g;
