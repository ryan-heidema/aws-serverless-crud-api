import { ZodError } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_JSON'
  | 'INVALID_PATH_PARAMETER'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export type ErrorDetail = {
  path: string;
  message: string;
  code: string;
};

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED' as const;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class InvalidJsonError extends AppError {
  readonly statusCode = 400;
  readonly code = 'INVALID_JSON' as const;

  constructor(message = 'Request body must be valid JSON') {
    super(message);
  }
}

export class InvalidPathParameterError extends AppError {
  readonly statusCode = 400;
  readonly code = 'INVALID_PATH_PARAMETER' as const;

  constructor(paramName: string) {
    super(`Path parameter '${paramName}' is required`);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND' as const;

  constructor(message = 'Item not found') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR' as const;

  constructor(error: ZodError) {
    const details: ErrorDetail[] = error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    super('Validation failed', details);
  }
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly code = 'INTERNAL_ERROR' as const;

  constructor(message = 'Internal server error') {
    super(message);
  }
}
