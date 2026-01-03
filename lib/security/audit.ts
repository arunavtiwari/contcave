import { Prisma } from '@prisma/client';

import prisma from '@/lib/prismadb';

interface AuditLogData {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonObject;
}

class AuditService {
    async log(data: AuditLogData): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    metadata: data.metadata || {},
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }

    async logPaymentDetailsAccess(
        userId: string,
        action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
        resourceId?: string,
        ipAddress?: string,
        userAgent?: string,
        metadata?: Prisma.InputJsonObject
    ): Promise<void> {
        await this.log({
            userId,
            action: `PAYMENT_DETAILS_${action}`,
            resource: 'PaymentDetails',
            resourceId,
            ipAddress,
            userAgent,
            metadata,
        });
    }

    async logEncryptionOperation(
        userId: string,
        operation: 'ENCRYPT' | 'DECRYPT',
        field: string,
        success: boolean,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId,
            action: `ENCRYPTION_${operation}`,
            resource: 'EncryptedField',
            metadata: {
                field,
                success,
                timestamp: new Date().toISOString(),
            },
            ipAddress,
        });
    }

    async logSuspiciousActivity(
        userId: string,
        reason: string,
        metadata?: Prisma.InputJsonObject
    ): Promise<void> {
        await this.log({
            userId,
            action: 'SUSPICIOUS_ACTIVITY',
            resource: 'Security',
            metadata: {
                reason,
                ...metadata,
            },
        });
    }

    async getAuditLogs(
        userId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<unknown[]> {
        return await prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
}

export const auditService = new AuditService();
export type { AuditLogData };
