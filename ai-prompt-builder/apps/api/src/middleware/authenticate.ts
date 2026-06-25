import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Headers වලින් token එක ලබා ගැනීම (case-insensitive)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log('🔍 Auth Middleware - Authorization Header:', authHeader);
  
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : undefined;
  console.log('🔍 Auth Middleware - Extracted Token:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
  console.log('🔍 Auth Middleware - JWT Secret used:', config.jwtSecret);

  if (!token) {
    console.log('❌ Auth Middleware - No token provided');
    res.status(401).json({ status: 'error', message: 'Access Denied. No token provided.' });
    return;
  }

  try {
    // Token එක නිවැරදි දැයි පරීක්ෂා කිරීම
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    console.log('✅ Auth Middleware - Token verified for user:', decoded.id);
    req.user = decoded; // ඊළඟ function එකට යන්න කලින් user id එක request එකට ඇතුළත් කරනවා
    next();
  } catch (error) {
    console.log('❌ Auth Middleware - Token verification failed:');
    console.log('   Error name:', (error as any).name);
    console.log('   Error message:', (error as any).message);
    console.log('   Token (first 50 chars):', token.substring(0, 50) + '...');
    res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
};