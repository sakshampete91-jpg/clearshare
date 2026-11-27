import type { SyntheticSample } from '../types/clearshare';

export const SYNTHETIC_SAMPLES: SyntheticSample[] = [
  {
    id: 'hr-resume',
    title: 'HR Resume',
    category: 'Recruitment & Screening',
    description:
      'Synthetic candidate profile with contact details, PAN, Aadhaar-like reference, GitHub token, locations, and employer history.',
    format: 'txt',
    content: `Candidate: Meera Nair
Email: meera.nair@talentmail.org
Phone: +91 98450 11223
Location: Kochi, Kerala
Interview Date: 04 November 2026
Application Reference: REQ-5510

Professional Summary:
Principal Security Architect previously at Horizon FinTech Pvt Ltd (joined 18 March 2022).
Tax & Identity Records (Synthetic):
- PAN Candidate: ABCPN5678G
- Aadhaar-like Ref: 3456 7890 1234
- Remote Portal IP: 203.0.113.45
- Accidental CI Token in Portfolio: ghp_SyntheticDemoTokenForClearshareTest9901

Reimbursement Note:
Travel reimbursement requested on card 4532 0151 1283 0366 for Kochi onboarding panel.`,
  },
  {
    id: 'medical-note',
    title: 'Medical Note',
    category: 'Clinical Intake Summary',
    description:
      'Synthetic patient intake note with identifiers, appointment date, clinic location, and internal case ID.',
    format: 'txt',
    content: `Patient Intake Summary — Case CASE-31084
Visit Date: 21 October 2026
Clinic: CareBridge Health Labs, Bengaluru

Patient: Vikram Kulkarni
Contact Email: vikram.k@patientmail.in
Mobile: 9822044556
Patient Account: ACCT-88412

Administrative Verification:
- Aadhaar-like ID: 4567 8901 2345
- Insurance Card (Valid Luhn): 4111 1111 1111 1111
- Invalid Card Typo Check: 4111 1111 1111 1112
- Telehealth Session IP: 172.16.40.12 (ignored malformed IP: 999.168.1.40)

Clinical Context:
Vikram Kulkarni visited the Bengaluru outpatient desk on 21 October 2026 for a follow-up referral under CASE-31084.`,
  },
  {
    id: 'support-ticket',
    title: 'Customer Support Ticket',
    category: 'Finance & Billing Support',
    description:
      'Synthetic payment dispute ticket containing direct PII, API key leak, valid/invalid card candidates, PAN, and linkable clues.',
    format: 'txt',
    content: `Ticket: TKT-48291 | Date: 12 October 2026
Organization: FinEdge Payments Pvt Ltd

Customer: Rahul Sharma
Rahul Sharma from Pune reported a duplicate payment issue on 12 October 2026.
Email: rahul.sharma@example.in (CC: rahul.sharma@example.in)
Phone: +91 98765-43210
Account Reference: ACCT-77410

Verification & Debug Payload:
- PAN Candidate: ABCDE1234F
- Aadhaar-like ID: 2345 6789 0123
- Login IPv4: 192.168.14.28
- Card (Valid Luhn): 4532 0151 1283 0366
- Card Typo (Invalid Luhn): 4532 0151 1283 0367
- Pasted Webhook Secret: sk-proj-synthetic99demoKeyForClearshareTest01

Follow-up: Escalate to Senior Fraud Operations Analyst in Pune under TKT-48291.`,
  },
];
