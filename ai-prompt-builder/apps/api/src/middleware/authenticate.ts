import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined;

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Access Denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};
