import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { AppError } from './errors';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Readable HTTP status constants for use across handlers
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
} as const;

export function success(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export function noContent(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
    body: '',
  };
}

export function errorResponse(error: AppError): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: error.statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    }),
  };
}
