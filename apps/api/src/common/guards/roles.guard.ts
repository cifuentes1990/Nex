import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'CASHIER' | 'EMPLOYEE' | 'VIEWER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    const roleHierarchy: Record<UserRole, number> = {
      SUPER_ADMIN: 100, ADMIN: 90, MANAGER: 70,
      SUPERVISOR: 60, CASHIER: 40, EMPLOYEE: 30, VIEWER: 10,
    };

    const userLevel = roleHierarchy[user?.role as UserRole] ?? 0;
    const minRequired = Math.min(...requiredRoles.map((r) => roleHierarchy[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
