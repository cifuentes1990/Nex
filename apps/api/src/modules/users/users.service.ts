import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as bcrypt from 'bcryptjs';

// Nivel jerárquico de cada rol — coincide con RolesGuard
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 100, ADMIN: 90, MANAGER: 70,
  SUPERVISOR: 60,   CASHIER: 40, EMPLOYEE: 30, VIEWER: 10,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditLogsService,
  ) {}

  // ── Utilidad: asegurar que el actor no puede tocar a alguien de mayor rango ──
  private checkHierarchy(actorRole: string, targetRole: string, action = 'modificar') {
    const actorLevel = ROLE_LEVEL[actorRole] ?? 0;
    const targetLevel = ROLE_LEVEL[targetRole] ?? 0;
    if (actorLevel <= targetLevel && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        `No puedes ${action} un usuario con rol ${targetRole}`,
      );
    }
  }

  async findAll(organizationId: string, query: any = {}) {
    const { role, status, branchId, search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { organizationId };
    if (role)     where.role = role;
    if (status)   where.status = status;
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true, email: true, name: true, avatar: true, phone: true,
          role: true, status: true, branchId: true,
          lastLoginAt: true, loginCount: true,
          salesGoal: true, totalSales: true, commissionRate: true,
          points: true, rank: true, createdAt: true,
          branch: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true, email: true, name: true, avatar: true, phone: true,
        role: true, status: true, permissions: true,
        branchId: true, salesGoal: true, totalSales: true,
        commissionRate: true, totalCommission: true,
        points: true, rank: true, createdAt: true, lastLoginAt: true,
        branch: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(organizationId: string, actorRole: string, dto: any, actorId?: string) {
    // Un ADMIN no puede crear SUPER_ADMIN
    if (dto.role && ROLE_LEVEL[dto.role] >= ROLE_LEVEL[actorRole] && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(`No puedes crear un usuario con rol ${dto.role}`);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password ?? 'TempPass123!', 12);
    const created = await this.prisma.user.create({
      data: {
        ...rest,
        organizationId,
        passwordHash,
        status: rest.status ?? 'ACTIVE',
      },
      select: {
        id: true, email: true, name: true, role: true,
        status: true, branchId: true, createdAt: true,
      },
    });

    // Auditoría — usuario creado
    this.audit.log({
      organizationId,
      userId: actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: created.id,
      newValues: { email: created.email, name: created.name, role: created.role },
    }).catch(() => {});

    return created;
  }

  async update(organizationId: string, actorId: string, actorRole: string, id: string, dto: any) {
    const target = await this.findOne(organizationId, id);

    // No puede modificar usuarios de mayor jerarquía (salvo SUPER_ADMIN)
    if (actorId !== id) {
      this.checkHierarchy(actorRole, target.role);
    }

    // No puede asignar un rol más alto que el propio
    if (dto.role && ROLE_LEVEL[dto.role] >= ROLE_LEVEL[actorRole] && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(`No puedes asignar el rol ${dto.role}`);
    }

    // Safely extract and strip fields that don't exist in Prisma User model
    const { password, currentPassword, newPassword, firstName, lastName, ...rest } = dto;

    // Allowed Prisma User update fields
    const ALLOWED = new Set(['email', 'name', 'avatar', 'phone', 'role', 'status',
      'branchId', 'twoFactorEnabled', 'permissions', 'preferences', 'salesGoal', 'commissionRate']);
    const data: any = {};
    for (const [k, v] of Object.entries(rest)) {
      if (ALLOWED.has(k)) data[k] = v;
    }

    // Support password change via newPassword field (sent from profile settings)
    const pwd = newPassword || password;
    if (pwd) {
      if (pwd.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
      data.passwordHash = await bcrypt.hash(pwd, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true,
        status: true, branchId: true, updatedAt: true,
      },
    });

    // Auditoría — usuario actualizado
    this.audit.log({
      organizationId,
      userId: actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldValues: { name: target.name, role: (target as any).role, branchId: (target as any).branchId },
      newValues: data,
    }).catch(() => {});

    return updated;
  }

  async setStatus(
    organizationId: string, actorId: string, actorRole: string,
    id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  ) {
    if (actorId === id) throw new BadRequestException('No puedes cambiar tu propio estado');
    const target = await this.findOne(organizationId, id);
    this.checkHierarchy(actorRole, target.role, 'cambiar el estado de');

    const result = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });

    // Auditoría — cambio de estado
    this.audit.log({
      organizationId,
      userId: actorId,
      action: 'STATUS_CHANGE',
      entity: 'User',
      entityId: id,
      oldValues: { status: (target as any).status },
      newValues: { status },
    }).catch(() => {});

    return result;
  }

  async delete(organizationId: string, actorId: string, actorRole: string, id: string) {
    if (actorId === id) throw new BadRequestException('No puedes eliminarte a ti mismo');
    const target = await this.findOne(organizationId, id);
    this.checkHierarchy(actorRole, target.role, 'eliminar');

    // Soft-delete: marcar como INACTIVE
    const result = await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, status: true },
    });

    // Auditoría — usuario desactivado (soft delete)
    this.audit.log({
      organizationId,
      userId: actorId,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      oldValues: { name: (target as any).name, email: (target as any).email, role: (target as any).role },
      newValues: { status: 'INACTIVE' },
    }).catch(() => {});

    return result;
  }

  async getLeaderboard(organizationId: string, branchId?: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: { in: ['CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER'] },
        ...(branchId && { branchId }),
      },
      select: {
        id: true, name: true, avatar: true, role: true,
        totalSales: true, salesGoal: true, totalCommission: true,
        points: true, rank: true,
        branch: { select: { name: true } },
      },
      orderBy: { totalSales: 'desc' },
      take: 20,
    });
  }
}
