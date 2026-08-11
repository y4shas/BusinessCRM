import { Request } from 'express';

/** Safely parse an integer route param, returning NaN if missing */
export function paramInt(req: Request, name: string): number {
  return parseInt(String(req.params[name]), 10);
}
