import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Invalid input',
        errors: validation.error.errors 
      });
      return;
    }

    const { email, password, name } = validation.data;
    const result = await AuthService.register(email, password, name);
    
    res.status(201).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Invalid input'
      });
      return;
    }

    const { email, password } = validation.data;
    const result = await AuthService.login(email, password);
    
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(401).json({ status: 'error', message: error.message });
  }
};