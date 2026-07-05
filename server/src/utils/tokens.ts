import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';

export interface AccessPayload {
  sub: string; // user id
  name: string;
  email: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessPayload;
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, config.jwt.refreshSecret, {
    expiresIn: `${config.jwt.refreshTtlDays}d`,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string; sid: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; sid: string };
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
