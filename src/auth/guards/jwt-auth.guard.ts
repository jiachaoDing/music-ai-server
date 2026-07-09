import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY_NAME } from '../constants';
import { DEV_USER, isSkipAuthEnabled } from '../../common/utils/dev-auth';

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  canActivate(context: ExecutionContext) {
    if (isSkipAuthEnabled()) {
      const request = context.switchToHttp().getRequest();
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
