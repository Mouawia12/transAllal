import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = exception.name.toUpperCase().replace(/EXCEPTION$/, '').replace(/HTTP/, '');
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string) ?? message;
        code = (res['error'] as string)?.toUpperCase().replace(/ /g, '_') ?? String(status);
        if (Array.isArray(res['message'])) {
          details = res['message'];
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as {
        code?: string;
        sqlMessage?: string;
      };
      const sqlMessage = driverError.sqlMessage?.toLowerCase() ?? '';
      const duplicateKey =
        /for key ['`"]([^'"`]+)['"`]/i.exec(driverError.sqlMessage ?? '')?.[1]?.toLowerCase() ??
        '';

      if (driverError.code === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        code = 'RESOURCE_CONFLICT';
        message = 'A record with the same unique value already exists';

        if (duplicateKey.includes('phone') || sqlMessage.includes('drivers.phone')) {
          code = 'DRIVER_PHONE_EXISTS';
          message = 'A driver with this phone number already exists';
        } else if (
          duplicateKey.includes('license') ||
          sqlMessage.includes('license_number')
        ) {
          code = 'DRIVER_LICENSE_EXISTS';
          message = 'A driver with this license number already exists';
        } else if (duplicateKey.includes('email') || sqlMessage.includes('users.email')) {
          code = 'USER_EMAIL_EXISTS';
          message = 'A user with this email already exists';
        }
      } else {
        this.logger.error(exception.message, exception.stack);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      data: null,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    });
  }
}
