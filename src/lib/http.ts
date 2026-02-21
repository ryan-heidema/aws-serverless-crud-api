import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { AppError } from './errors';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Success envelope: success, statusCode, data
export type ApiSuccess<T = unknown> = {
  success: true;
  statusCode: number;
  data: T;
};

// Error envelope: success, statusCode, error, optional requestId
export type ApiError = {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
};

// Union of success and error responses
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// HTTP status codes for handlers
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
} as const;

// Success response with standard envelope
export function success<T>(statusCode: number, data: T): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      success: true,
      statusCode,
      data,
    }),
  };
}

// 204 No Content response
export function noContent(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
    headers: JSON_HEADERS,
    body: '',
  };
}

// Error response with standard envelope
export function errorResponse(
  err: AppError,
  requestId?: string
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: err.statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({
      success: false,
      statusCode: err.statusCode,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    }),
  };
}

// Handler type returning ApiResponse<T>
export type StrictApiHandler<T = unknown> = (
  event: APIGatewayProxyEventV2
) => Promise<ApiResponse<T>>;
