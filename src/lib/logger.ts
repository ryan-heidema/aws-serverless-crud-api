import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

export type LogLevel = 'info' | 'warn' | 'error';

export type LogPayload = Record<string, unknown>;

/**
 * Structured JSON log line. Always includes level, message, timestamp
 * Caller should include requestId and userId when available
 */
function write(level: LogLevel, message: string, data: LogPayload): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function log(level: LogLevel, message: string, data: LogPayload = {}): void {
  write(level, message, data);
}

/**
 * Request metadata extracted from Lambda event/context for logging
 * userId is optional (e.g. missing before auth or on 401)
 */
export type RequestLogContext = {
  requestId: string;
  userId?: string;
  method?: string;
  path?: string;
  env?: string;
};

/**
 * Extracts requestId from context and optional userId from JWT claims
 * Does not throw; use when logging before or outside auth (e.g. request start, error handler)
 */
export function getRequestLogContext(
  event: APIGatewayProxyEventV2,
  context: Context
): RequestLogContext {
  const requestId = context.awsRequestId ?? event.requestContext?.requestId ?? 'unknown';
  const method = (event.requestContext as { http?: { method?: string } })?.http?.method;
  const path = event.rawPath ?? event.requestContext?.http?.path;
  const env = process.env.ENV_NAME ?? process.env.NODE_ENV;

  const claims = (
    event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, string> } } }
  )?.authorizer?.jwt?.claims;
  const userId = claims?.sub;

  const ctx: RequestLogContext = { requestId };
  if (userId !== undefined) ctx.userId = userId;
  if (method !== undefined) ctx.method = method;
  if (path !== undefined) ctx.path = path;
  if (env !== undefined) ctx.env = env;
  return ctx;
}
