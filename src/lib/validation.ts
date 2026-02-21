import { InvalidJsonError } from './errors';

export function parseJsonBody<T = unknown>(rawBody: string | undefined): T {
  try {
    return JSON.parse(rawBody ?? '{}') as T;
  } catch {
    throw new InvalidJsonError();
  }
}
