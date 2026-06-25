import { Router } from 'express';
import { buildPromptHandler } from '../controllers/prompts.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// මේ route එක ආරක්ෂිතයි
router.use(authenticate);

/**
 * @openapi
 * /api/v1/prompts/build:
 *   post:
 *     tags:
 *       - Prompts
 *     summary: Build a prompt from template
 *     description: Generate a final prompt by combining a template with user input data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *             properties:
 *               templateId:
 *                 type: string
 *                 minLength: 1
 *                 description: ID of the template to use
 *                 example: template_123abc
 *               userInput:
 *                 type: object
 *                 description: Key-value pairs to replace placeholders in template
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   tone: professional
 *                   audience: executives
 *                   topic: Q3 Results
 *     responses:
 *       200:
 *         description: Prompt built successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     finalPrompt:
 *                       type: string
 *                       description: Generated prompt with placeholders replaced
 *                       example: Write a professional email for executives about Q3 Results
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid request data
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/v1/prompts/build
router.post('/build', buildPromptHandler);

export default router;