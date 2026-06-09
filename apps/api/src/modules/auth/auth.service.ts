import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditLogsService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    // Create org + user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: this.generateSlug(dto.organizationName),
          currency: dto.currency || 'COP',
          timezone: dto.timezone || 'America/Bogota',
          subscription: {
            create: { plan: 'FREE', status: 'TRIAL' },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: this.userSelect(),
      });

      return { user, org };
    });

    const tokens = await this.generateTokens(result.user);
    await this.saveSession(result.user.id, tokens.refreshToken);

    this.logger.log(`New registration: ${dto.email} — org: ${result.org.id}`);
    this.mail.sendWelcome(dto.email, result.user.name, result.org.name).catch(() => {});

    // Auditoría — registro de nueva organización
    this.audit.log({
      organizationId: result.org.id,
      userId: result.user.id,
      action: 'REGISTER',
      entity: 'Organization',
      entityId: result.org.id,
      newValues: { name: result.org.name, adminEmail: dto.email },
    }).catch(() => {});

    return { user: result.user, organization: result.org, ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account suspended');
    if (user.status === 'INACTIVE') throw new UnauthorizedException('Account inactive');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const tokens = await this.generateTokens(user);
    await this.saveSession(user.id, tokens.refreshToken, ipAddress, userAgent);

    // Auditoría — inicio de sesión exitoso
    this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: { email: user.email, role: user.role },
    }).catch(() => {});

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, organization: user.organization, ...tokens };
  }

  async refreshToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(session.user);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string, token: string) {
    const session = await this.prisma.session.findFirst({
      where: { userId, token },
      include: { user: { select: { organizationId: true } } },
    });

    await this.prisma.session.deleteMany({ where: { userId, token } });

    // Auditoría — cierre de sesión
    if (session?.user?.organizationId) {
      this.audit.log({
        organizationId: session.user.organizationId,
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
      }).catch(() => {});
    }
  }

  async googleAuth(googleUser: any) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
      include: { organization: true },
    });

    if (!user) {
      const org = await this.prisma.organization.create({
        data: {
          name: `${googleUser.name}'s Organization`,
          slug: this.generateSlug(googleUser.name + '-' + Date.now()),
          subscription: { create: { plan: 'FREE', status: 'TRIAL' } },
        },
      });

      user = await this.prisma.user.create({
        data: {
          organizationId: org.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar,
          googleId: googleUser.googleId,
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
        include: { organization: true },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId, emailVerified: new Date() },
        include: { organization: true },
      });
    }

    const tokens = await this.generateTokens(user);
    await this.saveSession(user.id, tokens.refreshToken);
    const { passwordHash: _, ...safeUser } = user as any;
    return { user: safeUser, organization: (user as any).organization, ...tokens };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent — don't reveal if email exists

    const token = uuid();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Enviar email real con el enlace de restablecimiento
    this.mail.sendPasswordReset(email, user.name, token).catch(() => {});
    this.logger.log(`Password reset email sent to: ${email}`);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    const user = await this.prisma.user.findUnique({
      where: { id: reset.userId },
      select: { organizationId: true, email: true },
    });

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    // Auditoría — restablecimiento de contraseña
    if (user) {
      this.audit.log({
        organizationId: user.organizationId,
        userId: reset.userId,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: reset.userId,
        metadata: { email: user.email },
      }).catch(() => {});
    }

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveSession(userId: string, refreshToken: string, ip?: string, ua?: string) {
    return this.prisma.session.create({
      data: {
        userId,
        token: uuid(),
        refreshToken,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private userSelect() {
    return {
      id: true, email: true, name: true, avatar: true,
      role: true, status: true, organizationId: true,
      branchId: true, permissions: true, preferences: true,
      createdAt: true,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 7);
  }
}
