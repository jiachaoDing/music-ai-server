import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JWT_STRATEGY_NAME } from '../../auth/constants';
import { DEV_USER, isSkipAuthEnabled } from '../utils/dev-auth';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (isSkipAuthEnabled()) {
      const request = context.switchToHttp().getRequest();
      request.user = DEV_USER;
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return result.catch(() => true);
    }
    if (result instanceof Observable) {
      return result.pipe(catchError(() => of(true)));
    }
    return result;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (isSkipAuthEnabled()) {
      return DEV_USER as TUser;
    }
    if (err || !user) return null;
    return user;
  }
}
