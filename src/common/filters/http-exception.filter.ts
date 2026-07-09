import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

function resolveCode(status: number, message: string): number {
  if (status === HttpStatus.BAD_GATEWAY && message.includes('MiniMax')) {
    return 600;
  }
  if ([400, 401, 403, 404, 409, 429, 500, 600].includes(status)) {
    return status;
  }
  return status >= 500 ? 500 : 400;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : Array.isArray((exceptionResponse as { message?: unknown }).message)
          ? ((exceptionResponse as { message: string[] }).message ?? []).join(
              '; ',
            )
          : ((exceptionResponse as { message?: string }).message ??
            exception.message);

    response.status(status).json({
      code: resolveCode(status, message),
      message,
      data: null,
    });
  }
}
