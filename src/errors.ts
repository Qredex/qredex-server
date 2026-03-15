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
