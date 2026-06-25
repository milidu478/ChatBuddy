import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: '7d',
  });
};
