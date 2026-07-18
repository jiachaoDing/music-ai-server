import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY_NAME } from '../constants';
import { DEV_USER, isSkipAuthEnabled } from '../../common/utils/dev-auth';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { isAdminKey } from '../../common/utils/admin-key';

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (
      request?.url?.startsWith('/api/admin') &&
      isAdminKey(request.headers['x-admin-key'] || request.query.key)
    ) {
      request.user = DEV_USER;
      return true;
    }

    if (isSkipAuthEnabled()) {
      request.user = DEV_USER;
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser) {
    if (isSkipAuthEnabled()) {
      return DEV_USER as TUser;
    }
    if (err || !user) {
      throw err ?? new UnauthorizedException('未登录或 Token 已过期');
    }
    return user;
  }
}
