import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import type { RequestContext } from '../types/request-context.type';

export function resolveOptionalCompanyId(
  user: RequestContext,
  requestedCompanyId?: string | null,
): string | undefined {
  if (user.role === Role.SUPER_ADMIN) {
    return requestedCompanyId ?? undefined;
  }

  if (!user.companyId) {
    throw new ForbiddenException('No company scope is available for this user');
  }

  if (requestedCompanyId && requestedCompanyId !== user.companyId) {
    throw new ForbiddenException('Not authorized for this company');
  }

  return user.companyId;
}

export function resolveRequiredCompanyId(
  user: RequestContext,
  requestedCompanyId?: string | null,
): string {
  const companyId = resolveOptionalCompanyId(user, requestedCompanyId);
  if (!companyId) {
    throw new BadRequestException('companyId is required');
  }

  return companyId;
}

export function resolveDriverId(user: RequestContext): string {
  if (!user.driverId) {
    throw new ForbiddenException('Driver context is required');
  }

  return user.driverId;
}
