import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateToken = (userId: string): string => {
  console.log('🔑 JWT - Generating access token with secret:', config.jwtSecret);
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: '15m', // Access token එක විනාඩි 15කින් කල් ඉකුත් වෙනවා
  });
};

export const generateRefreshToken = (userId: string): string => {
  console.log('🔑 JWT - Generating refresh token with secret:', config.jwtSecret);
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: '7d', // Refresh token එක දවස් 7ක් වලංගුයි
  });
};