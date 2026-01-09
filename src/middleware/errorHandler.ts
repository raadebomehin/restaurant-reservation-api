import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {  // Add `: void` here
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && { details: err.details })
      }
    });
    return;  // Add explicit return
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
};

// Helper functions for common errors
export const notFound = (resource: string, id?: number | string) => {
  return new AppError(
    `${resource} not found`,
    404,
    'NOT_FOUND',
    id ? { id } : undefined
  );
};

export const validationError = (message: string, errors?: ValidationError[]) => {
  return new AppError(
    message,
    400,
    'VALIDATION_ERROR',
    errors ? { errors } : undefined
  );
};

export const conflictError = (message: string, details?: any) => {
  return new AppError(
    message,
    409,
    'CONFLICT',
    details
  );
};