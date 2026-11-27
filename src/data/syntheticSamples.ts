import type { SyntheticSample } from '../types/clearshare';

export const SYNTHETIC_SAMPLES: SyntheticSample[] = [
  {
    id: 'support-ticket',
    title: 'Customer Support Ticket',
    category: 'Finance & Billing Support',
    description:
      'Synthetic payment dispute ticket containing direct PII, valid/invalid card candidates, PAN, Aadhaar-like ID, and linkable clues.',
    format: 'txt',
    content: `Subject: Urgent Payment Settlement Issue — Ticket TKT-48291
Date: 12 October 2026
Organization: FinEdge Payments Pvt Ltd

Customer Details:
Rahul Sharma from Pune reported a duplicate UPI/card charge on 12 October 2026.
Primary Contact: rahul.sharma@example.in (secondary: rahul.sharma@example.in)
Mobile Number: +91 98765-43210
Account Reference: ACCT-77410

Verification & Telemetry Snapshot:
- Submitted PAN Candidate: ABCDE1234F
- Submitted Aadhaar-like Reference: 2345 6789 0123
- Client Login IP: 192.168.14.28
- Card Used (Valid Luhn Checksum): 4532 0151 1283 0366
- Typo Card Entry (Invalid Luhn Checksum): 4532 0151 1283 0367

Incident Summary:
Rahul Sharma visited the Pune regional helpdesk at 14:30 IST requesting reversal under TKT-48291.
Please escalate to the Senior Fraud Operations Analyst before 15 October 2026.`,
  },
  {
    id: 'bug-report',
    title: 'Software Bug Report',
    category: 'Engineering & Incident Ops',
    description:
      'Synthetic production error log with valid & out-of-range IPv4 addresses, developer contacts, internal ticket IDs, and test card strings.',
    format: 'txt',
    content: `Incident Report: INC-9034 (Linked Ticket TKT-11904)
Reported On: 19 November 2026
Team / Organization: CloudStack Labs, Bengaluru

Reporter: Ananya Verma (ananya.verma@cloudstack.test)
On-call Engineer Phone: 91 98111 22334
Affected Tenant Account: ACCT-90412

Network Diagnostics:
- Primary Gateway IPv4: 10.24.88.19
- Fallback Edge Node: 172.16.40.12
- Corrupted Log String (Invalid IPv4 octets): 999.168.1.40

Payload Audit Fragment:
Checkout webhook failed for test card 4111 1111 1111 1111 and fallback 4111 1111 1111 1112.
Merchant KYC PAN on sandbox: PQRSX9876K
Support mailbox CC: ananya.verma@cloudstack.test, ops-alerts@cloudstack.test

Note: Ananya Verma is the Principal Site Reliability Engineer in Bengaluru handling INC-9034.`,
  },
  {
    id: 'recruitment-csv',
    title: 'Recruitment Document (CSV)',
    category: 'HR & Hiring Pipeline',
    description:
      'Synthetic candidate shortlist CSV with quoted commas, PAN/Aadhaar-like values, locations, dates, and unique interview references.',
    format: 'csv',
    content: `Candidate Name,Email,Phone,Location,Applied Role,Reference ID,Notes
"Meera Nair","meera.nair@talentmail.org","+91 98450 11223","Kochi","Lead Security Architect","REQ-5510","Interviewed on 04 November 2026; PAN ABCDE5678G; IP 203.0.113.45"
"Vikram Kulkarni","vikram.k@devmail.in","9822044556","Hyderabad","Privacy Engineer","REQ-5511","Aadhaar-like ID 3456 7890 1234; previously at Horizon FinTech, joined 08 November 2026"
"Meera Nair","meera.nair@talentmail.org","+91 98450 11223","Kochi","Lead Security Architect","REQ-5510","Follow-up scheduled with Horizon FinTech panel; card reimbursement 4532015112830366"`,
  },
];
