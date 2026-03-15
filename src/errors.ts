export interface QredexErrorDetails {
  status?: number;
  errorCode?: string;
  requestId?: string;
  traceId?: string;
  responseBody?: unknown;
  responseText?: string;
  cause?: unknown;
}

export class QredexError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly responseBody?: unknown;
  readonly responseText?: string;
  declare readonly cause?: unknown;

  constructor(message: string, details: QredexErrorDetails = {}) {
    super(message);
    this.name = new.target.name;
    this.status = details.status;
    this.errorCode = details.errorCode;
    this.requestId = details.requestId;
    this.traceId = details.traceId;
    this.responseBody = details.responseBody;
    this.responseText = details.responseText;
    this.cause = details.cause;
  }
}

export class ConfigurationError extends QredexError {}

export class ApiError extends QredexError {}

export class AuthenticationError extends ApiError {}

export class AuthorizationError extends ApiError {}

export class ValidationError extends ApiError {}

export class ConflictError extends ApiError {}

export class RateLimitError extends ApiError {
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    details: QredexErrorDetails & { retryAfterSeconds?: number } = {},
  ) {
    super(message, details);
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export class NetworkError extends QredexError {}

export function isQredexError(error: unknown): error is QredexError {
  return error instanceof QredexError;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}
