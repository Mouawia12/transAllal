import { Role } from '../enums/role.enum';

export interface RequestContext {
  userId: string;
  role: Role;
  companyId: string | null;
  driverId: string | null;
}
