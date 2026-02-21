import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';

import { AppError, InternalServerError } from './errors';
import { errorResponse } from './http';
import { getRequestLogContext, log } from './logger';

/**
 * A "strict" handler always returns a response (no callback-style `void`)
 */
export type StrictHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyStructuredResultV2>;

export function withErrorHandling(handler: StrictHandler): APIGatewayProxyHandlerV2 {
  return async (event, context) => {
    const ctx = getRequestLogContext(event, context);

    try {
      log('info', 'Request started', {
        requestId: ctx.requestId,
        userId: ctx.userId,
        method: ctx.method,
        path: ctx.path,
        env: ctx.env,
      });
      return await handler(event, context);
    } catch (err) {
      const requestId = ctx.requestId ?? event.requestContext?.requestId;

      if (err instanceof AppError) {
        log('warn', 'Client error', {
          requestId: ctx.requestId,
          userId: ctx.userId,
          errorCode: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
          ...(event.body ? { payload: event.body } : {}),
        });
        return errorResponse(err, requestId);
      }

      log('error', 'Unhandled exception', {
        requestId: ctx.requestId,
        userId: ctx.userId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        ...(event.body ? { input: event.body } : {}),
        env: ctx.env,
      });
      return errorResponse(new InternalServerError(), requestId);
    }
  };
}
