import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { UnauthorizedError } from "./errors";

/**
 * Extracts the authenticated user id from the JWT (Cognito `sub` claim)
 * Throws UnauthorizedError if the request has no valid JWT claims
 */
export function getUserId(event: APIGatewayProxyEventV2): string {
  const claims = (event.requestContext as { authorizer?: { jwt?: { claims?: Record<string, string> } } })
    .authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (!sub) throw new UnauthorizedError();
  return sub;
}
