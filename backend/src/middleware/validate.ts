import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.');
          if (!errors[key]) errors[key] = [];
          errors[key].push(issue.message);
        }
        next(new ValidationError('Validation failed', errors));
      } else {
        next(err);
      }
    }
  };
}
