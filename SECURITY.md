# Security Policy

We take the security of Contcave seriously. This document outlines our policy regarding security updates and how to report vulnerabilities.

## Supported Versions

Currently, the following versions of the project receive security updates:

| Version | Supported | Notes |
| :--- | :---: | :--- |
| `0.1.x` (Main/Staging) | Yes | Active development branch built on Next.js 16 & React 19. |
| `< 0.1.0` | No | Legacy versions. Please upgrade to the latest master/staging. |

We recommend keeping all dependencies updated to their latest security releases, particularly critical packages like `@prisma/client`, `next`, `next-auth`, and `ably`.

## Reporting a Vulnerability

If you discover a potential security vulnerability in this project, please **do not raise a public issue**. Instead, report it privately to our team.

### Submission Process
1. Email your report to **security@contcave.com**.
2. Include the following details in your email to help us triage the issue:
   - **Type of issue** (e.g., SQL injection, XSS, authentication bypass, data leakage, RCE).
   - **Step-by-step instructions** or a proof-of-concept (PoC) to reproduce the vulnerability.
   - **Potential impact** of the vulnerability.
   - **Affected components** (e.g., specific API routes, server actions, client components).
3. If you would like to encrypt your report, please request our team's PGP key.

### Response SLA
- **Initial Acknowledgment**: Within 48 business hours.
- **Triage & Classification**: Within 7 business days.
- **Remediation & Patch**: Timeline depends on the severity, but we aim for critical patches within 14 business days.

## Out-of-Scope Vulnerabilities

The following issues are generally considered out of scope unless they exhibit a severe and unique exploit vector:
- Spam or social engineering techniques.
- Denial of Service (DoS/DDoS) attacks.
- Vulnerabilities affecting third-party services (e.g., Cashfree, Ably, Cloudflare R2) should be reported directly to those vendors, though we appreciate a heads-up if they impact Contcave operations.

## Encryption Standards

Contcave enforces AES-256-CBC encryption on all PII and sensitive payment/business details stored in the database. Please refer to [CONTRIBUTING.md](file:///c:/Users/saman/OneDrive/Desktop/Contcave%20Project/contcave/CONTRIBUTING.md) for database encryption standards to ensure security is maintained across all PR contributions.
