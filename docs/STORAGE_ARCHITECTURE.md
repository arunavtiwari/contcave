# Storage Architecture & Folder Convention (R2)

This document outlines the enterprise-grade storage structure implemented for ContCave using Cloudflare R2 (S3-compatible). The architecture follows **Owner-Isolated Data Namespacing** to ensure security, GDPR compliance (Right to Erasure), and optimized CDN caching.

## Core Hierarchy

All assets are stored under a top-level `users/` namespace, ensuring that every file is linked to a specific authenticated principal.

```text
users/
└── {userId}/
    ├── profiles/
    │   └── {hash}.(jpg|png)           # User avatars and profile backgrounds
    ├── listings/
    │   └── {listingId}/
    │       ├── main/
    │       │   └── {hash}.(jpg|png)   # Primary gallery images for the listing
    │       ├── sets/
    │       │   └── {setId}/
    │       │       └── {hash}.jpg     # Specific set (room/studio) images
    │       ├── addons/
    │       │   └── {hash}.jpg         # Custom addon thumbnails
    │       ├── agreements/
    │       │   └── {hash}.pdf         # Legally binding lease/usage agreements
    │       └── verifications/
    │           └── {hash}.(pdf|jpg)   # Host verification documents (Aadhaar, etc.)
    └── invoices/
        └── {invoiceId}/
            └── {hash}.pdf             # Payment receipts/invoices
```

## Security Design

1. **Tenant Isolation**: Files are uploaded using presigned URLs restricted to their respective `{userId}` prefixes. Users cannot write outside their dedicated root.
2. **Deterministic Paths**: Paths are generated using stable identifiers (`userId`, `listingId`, `invoiceId`) which allows for programmatic cleanup and automated data-portability exports.
3. **Hardened Cleanup**: In the event of account deletion, the system is designed to recursively purge `users/{userId}/*` to remove all associated PI (Personally Identifiable) assets.

## Upload Optimization Strategy

The architecture employs a **Hybrid Precision Upload** pattern used by high-scale platforms (AWS, Vercel, Netflix) to maximize performance and minimize latency:

### 1. Client-Side Presigned URLs (Images/Videos)
- **Why**: Used for all user-selected files.
- **Optimization**: Files stream directly from the user's browser to Cloudflare R2. This bypasses the Next.js API server entirely, preventing "Serverless Function Timeouts" and avoiding Vercel's 4.5MB payload limits. It preserves server memory for logic instead of data-shoveling.

### 2. Server-Side Direct Put (Invoices/Agreements)
- **Why**: Used for assets generated dynamically by the backend (e.g., PDFs).
- **Optimization**: Since the PDF is born in the server's memory (RAM), it is piped directly to R2 over Cloudflare's private backbone. This is faster than sending the PDF to the user's device only to have their browser upload it back again.

## Implementation Details

- **Storage Provider**: Cloudflare R2
- **Access Protocol**: S3 API (AWS SDK v3)
- **Transport**: Encrypted TLS 1.3
- **CDN**: Cloudflare Managed Public Access for high-speed global delivery.
