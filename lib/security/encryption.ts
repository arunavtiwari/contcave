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

class EncryptionService {
    private readonly masterKey: string;
    private readonly keyVersion: string;
    private readonly algorithm = 'aes-256-cbc';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly saltLength = 16;
    private readonly iterations = 10000;
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
        return crypto.pbkdf2Sync(
            this.masterKey,
            salt,
            this.iterations,
            this.keyLength,
            this.digest
        );
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
