export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_CHALLENGE: "INVALID_CHALLENGE",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",
  CHALLENGE_ALREADY_USED: "CHALLENGE_ALREADY_USED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  INVALID_SESSION: "INVALID_SESSION",
  ROLE_REQUIRED: "ROLE_REQUIRED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  /** Legacy aliases kept for existing callers */
  AUTH_CHALLENGE_INVALID: "INVALID_CHALLENGE",
  AUTH_SIGNATURE_INVALID: "INVALID_SIGNATURE",
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  ESCROW_NOT_FOUND: "ESCROW_NOT_FOUND",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  TRANSACTION_NOT_VERIFIED: "TRANSACTION_NOT_VERIFIED",
  INVALID_CONTRACT_CALL: "INVALID_CONTRACT_CALL",
  UNSUPPORTED_NETWORK: "UNSUPPORTED_NETWORK",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  MILESTONE_NOT_VERIFIED: "MILESTONE_NOT_VERIFIED",
  MILESTONE_ALREADY_RELEASED: "MILESTONE_ALREADY_RELEASED",
  DEMO_MODE_DISABLED: "DEMO_MODE_DISABLED",
  DONATION_ALREADY_RECORDED: "DONATION_ALREADY_RECORDED",
  DATABASE_ERROR: "DATABASE_ERROR",
  DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  INVALID_RELATIONSHIP: "INVALID_RELATIONSHIP",
  USER_SUSPENDED: "USER_SUSPENDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

const STATUS_BY_CODE = {
  [ErrorCodes.INVALID_REQUEST]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.INVALID_CHALLENGE]: 401,
  [ErrorCodes.CHALLENGE_EXPIRED]: 401,
  [ErrorCodes.CHALLENGE_ALREADY_USED]: 401,
  [ErrorCodes.INVALID_SIGNATURE]: 401,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.SESSION_REVOKED]: 401,
  [ErrorCodes.INVALID_SESSION]: 401,
  [ErrorCodes.ROLE_REQUIRED]: 403,
  [ErrorCodes.PERMISSION_DENIED]: 403,
  [ErrorCodes.CAMPAIGN_NOT_FOUND]: 404,
  [ErrorCodes.ESCROW_NOT_FOUND]: 404,
  [ErrorCodes.TRANSACTION_NOT_FOUND]: 404,
  [ErrorCodes.TRANSACTION_FAILED]: 400,
  [ErrorCodes.TRANSACTION_NOT_VERIFIED]: 400,
  [ErrorCodes.INVALID_CONTRACT_CALL]: 400,
  [ErrorCodes.UNSUPPORTED_NETWORK]: 400,
  [ErrorCodes.INSUFFICIENT_BALANCE]: 400,
  [ErrorCodes.MILESTONE_NOT_VERIFIED]: 400,
  [ErrorCodes.MILESTONE_ALREADY_RELEASED]: 409,
  [ErrorCodes.DEMO_MODE_DISABLED]: 403,
  [ErrorCodes.DONATION_ALREADY_RECORDED]: 409,
  [ErrorCodes.DATABASE_ERROR]: 503,
  [ErrorCodes.DUPLICATE_RESOURCE]: 409,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.INVALID_RELATIONSHIP]: 400,
  [ErrorCodes.USER_SUSPENDED]: 403,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

export class AppError extends Error {
  constructor(code, message, { status, details } = {}) {
    super(message || code);
    this.name = "AppError";
    this.code = code;
    this.status = status || STATUS_BY_CODE[code] || 500;
    this.details = details;
  }
}

export function toErrorResponse(err) {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    };
  }

  if (err?.code && STATUS_BY_CODE[err.code]) {
    return {
      status: err.status || STATUS_BY_CODE[err.code],
      body: { error: err.message, code: err.code },
    };
  }

  return {
    status: 500,
    body: { error: "Internal server error", code: ErrorCodes.INTERNAL_ERROR },
  };
}

export function errorMiddleware(err, _req, res, _next) {
  const { status, body } = toErrorResponse(err);
  res.status(status).json(body);
}
