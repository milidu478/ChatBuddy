import { Router } from 'express';
import {
  getMeHandler,
  getApiKeySettingsHandler,
  saveGeminiApiKeyHandler,
  deleteGeminiApiKeyHandler,
  validateGeminiApiKeyHandler,
} from '../controllers/users.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, getMeHandler);
router.get('/me/api-key', authenticate, getApiKeySettingsHandler);
router.put('/me/gemini-api-key', authenticate, saveGeminiApiKeyHandler);
router.delete('/me/gemini-api-key', authenticate, deleteGeminiApiKeyHandler);
router.post('/me/gemini-api-key/validate', authenticate, validateGeminiApiKeyHandler);

export default router;