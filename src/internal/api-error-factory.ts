import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ValidationError,
} from "../errors";

interface ApiErrorFactoryInput {
  status: number;
  errorCode?: string;
  message: string;
  requestId?: string;
  traceId?: string;
  responseBody?: unknown;
  responseText?: string;
  retryAfterSeconds?: number;
}

export function createApiError(input: ApiErrorFactoryInput): ApiError {
  const details = {
    status: input.status,
    errorCode: input.errorCode,
    requestId: input.requestId,
    traceId: input.traceId,
    responseBody: input.responseBody,
    responseText: input.responseText,
  };

  if (input.status === 400) {
    return new ValidationError(input.message, details);
  }

  if (input.status === 401) {
    return new AuthenticationError(input.message, details);
  }

  if (input.status === 403) {
    return new AuthorizationError(input.message, details);
  }

  if (input.status === 409) {
    return new ConflictError(input.message, details);
  }

  if (input.status === 429) {
    return new RateLimitError(input.message, {
      ...details,
      retryAfterSeconds: input.retryAfterSeconds,
    });
  }

  return new ApiError(input.message, details);
}
