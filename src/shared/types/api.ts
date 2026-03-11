export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type ApiSuccessResponse<T> = T;

export const ErrorCodes = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;
