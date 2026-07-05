import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessPayload } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing access token'));
  }
  try {
    req.auth = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
