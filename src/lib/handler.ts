import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";
import { AppError, InternalServerError } from "./errors";
import { errorResponse } from "./http";

/**
 * A "strict" handler always returns a response (no callback-style `void`)
 */
export type StrictHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyStructuredResultV2>;

export function withErrorHandling(
  handler: StrictHandler
): APIGatewayProxyHandlerV2 {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err);
      }

      console.error("Unhandled error:", err);
      return errorResponse(new InternalServerError());
    }
  };
}

