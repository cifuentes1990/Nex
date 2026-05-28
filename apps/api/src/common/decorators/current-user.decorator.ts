import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId || request.headers['x-organization-id'];
  },
);

/**
 * Retorna el branchId efectivo para la request:
 * - CASHIER / EMPLOYEE / SUPERVISOR → solo puede ver su propia sede (user.branchId)
 * - MANAGER / ADMIN / SUPER_ADMIN  → puede filtrar por ?branchId= o no filtrar
 */
export const EffectiveBranchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    const BRANCH_LOCKED_ROLES = ['CASHIER', 'EMPLOYEE', 'SUPERVISOR'];

    if (BRANCH_LOCKED_ROLES.includes(user?.role)) {
      return user.branchId ?? null;
    }
    // Admins / managers pueden pasar ?branchId opcionalmente
    return request.query?.branchId ?? null;
  },
);
