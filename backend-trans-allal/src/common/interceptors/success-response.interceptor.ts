import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isWrappedSuccessResponse(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const keys = Object.keys(value as Record<string, unknown>);
  return (
    keys.includes('data') &&
    keys.every((key) => key === 'data' || key === 'meta')
  );
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (isWrappedSuccessResponse(value)) {
          return value;
        }

        return {
          data: value ?? null,
        };
      }),
    );
  }
}
