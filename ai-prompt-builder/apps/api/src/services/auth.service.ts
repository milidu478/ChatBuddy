import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';

export class AuthService {
  // 1. අලුත් ගිණුමක් සෑදීම (Register)
  static async register(email: string, password: string, name?: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null },
    });

    const accessToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken };
  }

  // 2. ගිණුමට ඇතුල් වීම (Login)
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const accessToken = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    console.log('🔐 Login Service - User logged in:', user.id);
    console.log('🔐 Login Service - Access Token generated (first 50 chars):', accessToken.substring(0, 50) + '...');

    return { user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken };
  }
}