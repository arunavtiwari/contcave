import 'server-only';

import crypto from 'node:crypto';

interface EncryptionResult {
    encrypted: string;
    iv: string;
}

interface DecryptionInput {
    encrypted: string;
    iv: string;
}

/**
 * Key derivation is PBKDF2 with 310k iterations — roughly 150-300ms of *synchronous*
 * CPU per call, which blocks the event loop for every other request in the process.
 * Because the master key is fixed for the process lifetime, `salt -> key` is a pure
 * function, so derived keys are memoised in a bounded LRU. Reading a list of records
 * (admin tables decrypt several fields per row) then costs one derivation per distinct
 * salt instead of one per field per request.
 *
 * Only derived key material lives here — never plaintext — and it is no more sensitive
 * than the master key already held in memory.
 */
// Each entry is a 32-byte key plus its salt, so holding several thousand is negligible —
// and the limit wants to stay comfortably above (owners x encrypted fields) so that paging
// through an admin table never evicts keys it is about to need again.
const KEY_CACHE_LIMIT = 5000;
const derivedKeyCache = new Map<string, Buffer>();

function getCachedKey(saltHex: string): Buffer | undefined {
    const cached = derivedKeyCache.get(saltHex);
    if (!cached) return undefined;
    // Re-insert to mark as most recently used.
    derivedKeyCache.delete(saltHex);
    derivedKeyCache.set(saltHex, cached);
    return cached;
}

function setCachedKey(saltHex: string, key: Buffer): void {
    if (derivedKeyCache.size >= KEY_CACHE_LIMIT) {
        const oldest = derivedKeyCache.keys().next().value;
        if (oldest !== undefined) derivedKeyCache.delete(oldest);
    }
    derivedKeyCache.set(saltHex, key);
}

class EncryptionService {
    private readonly masterKey: string;
    private readonly keyVersion: string;
    private readonly algorithm = 'aes-256-cbc';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly saltLength = 16;
    private readonly iterations = 310_000;
    private readonly digest = 'sha256';

    constructor() {
        this.masterKey = process.env.ENCRYPTION_MASTER_KEY || '';
        this.keyVersion = process.env.ENCRYPTION_KEY_VERSION || 'v1';

        if (!this.masterKey) {
            throw new Error('ENCRYPTION_MASTER_KEY is not set in environment variables');
        }

        if (this.masterKey.length < 32) {
            throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters');
        }
    }

    private deriveKey(salt: Buffer): Buffer {
        const saltHex = salt.toString('hex');
        const cached = getCachedKey(saltHex);
        if (cached) return cached;

        const key = crypto.pbkdf2Sync(
            this.masterKey,
            salt,
            this.iterations,
            this.keyLength,
            this.digest
        );
        setCachedKey(saltHex, key);
        return key;
    }

    encrypt(plaintext: string): EncryptionResult {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new Error('Plaintext must be a non-empty string');
        }

        try {
            const iv = crypto.randomBytes(this.ivLength);
            const salt = crypto.randomBytes(this.saltLength);
            const key = this.deriveKey(salt);

            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            return {
                encrypted: `${salt.toString('hex')}:${encrypted}`,
                iv: iv.toString('hex'),
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    decrypt(input: DecryptionInput): string {
        if (!input || !input.encrypted || !input.iv) {
            throw new Error('Invalid decryption input');
        }

        try {
            const [saltHex, ciphertext] = input.encrypted.split(':');

            if (!saltHex || !ciphertext) {
                throw new Error('Invalid encrypted data format');
            }

            const salt = Buffer.from(saltHex, 'hex');
            const iv = Buffer.from(input.iv, 'hex');
            const key = this.deriveKey(salt);

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            if (!decrypted) {
                throw new Error('Decryption resulted in empty string');
            }

            return decrypted;
        } catch (_error) {
            throw new Error('Decryption failed - invalid key or corrupted data');
        }
    }

    mask(value: string, visibleChars: number = 4): string {
        if (!value || value.length <= visibleChars) {
            return '*'.repeat(value?.length || 4);
        }
        return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
    }

    getKeyVersion(): string {
        return this.keyVersion;
    }

    validateEncryptedData(data: EncryptionResult): boolean {
        try {
            return !!(data.encrypted && data.iv && data.encrypted.includes(':'));
        } catch {
            return false;
        }
    }
}

export const encryptionService = new EncryptionService();
export type { DecryptionInput,EncryptionResult };
