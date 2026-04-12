import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../../common/enums/role.enum';
import { RequestContext } from '../../../common/types/request-context.type';

interface JwtPayload {
  sub: string;
  role: Role;
  companyId: string | null;
  driverId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtSecret') ?? '',
    });
  }

  validate(payload: JwtPayload): RequestContext {
    if (!payload?.sub) throw new UnauthorizedException();
    return {
      userId: payload.sub,
      role: payload.role,
      companyId: payload.companyId ?? null,
      driverId: payload.driverId ?? null,
    };
  }
}
