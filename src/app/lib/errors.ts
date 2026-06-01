export type AppError = {
  message: string;
  code?: string;
  status?: number;
  recoverable?: boolean;
};

export class AppRequestError extends Error {
  status?: number;
  code?: string;
  recoverable: boolean;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'AppRequestError';
    this.status = error.status;
    this.code = error.code;
    this.recoverable = error.recoverable ?? true;
  }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function toAppError(error: unknown, fallback?: string): AppError {
  if (error instanceof AppRequestError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      recoverable: error.recoverable,
    };
  }

  return {
    message: getErrorMessage(error, fallback),
    recoverable: true,
  };
}
