import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  // ── Escribir entrada de auditoría ────────────────────────────────────
  async log(entry: {
    organizationId: string;
    userId?: string;
    action: string;       // e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'STATUS_CHANGE'
    entity: string;       // e.g. 'User', 'Product', 'Inventory', 'Order'
    entityId?: string;
    oldValues?: object;
    newValues?: object;
    ipAddress?: string;
    userAgent?: string;
    metadata?: object;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId:         entry.userId,
        action:         entry.action,
        entity:         entry.entity,
        entityId:       entry.entityId,
        oldValues:      entry.oldValues as any,
        newValues:      entry.newValues as any,
        ipAddress:      entry.ipAddress,
        userAgent:      entry.userAgent,
        metadata:       (entry.metadata ?? {}) as any,
      },
    });
  }

  // ── Consultar logs ───────────────────────────────────────────────────
  async findAll(
    organizationId: string,
    query: {
      userId?: string;
      entity?: string;
      action?: string;
      entityId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 50;
    const skip  = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.userId)   where.userId   = query.userId;
    if (query.entity)   where.entity   = query.entity;
    if (query.action)   where.action   = query.action;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to   && { lte: new Date(query.to) }),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }
}
