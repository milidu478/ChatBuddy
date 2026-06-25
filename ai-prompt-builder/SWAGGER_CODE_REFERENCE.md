# Swagger Integration - Code Reference Guide

## Quick Summary of Changes

This guide provides the complete code for the Swagger/OpenAPI integration. All files have been created/updated successfully.

---

## File 1: `src/config/swagger.ts` (NEW FILE)

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Prompt Builder API',
      version: '1.0.0',
      description: 'REST API for AI Prompt Builder - A platform to create, manage, and build dynamic prompts using templates.',
      contact: {
        name: 'API Support',
        email: 'support@aipromptbuilder.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.aipromptbuilder.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: { /* ... */ },
        AuthResponse: { /* ... */ },
        Template: { /* ... */ },
        Error: { /* ... */ },
      },
    },
  },
  apis: [
    'src/routes/auth.routes.ts',
    'src/routes/users.routes.ts',
    'src/routes/templates.routes.ts',
    'src/routes/prompts.routes.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
```

---

## File 2: `src/server.ts` (UPDATED)

### Imports Added:
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
```

### Middleware Added (after `app.use(express.json())`):
```typescript
// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Prompt Builder API Docs',
}));
```

---

## File 3: `src/routes/auth.routes.ts` (UPDATED)

JSDoc annotations added before each route:

### POST /api/v1/auth/register:
```typescript
/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User password (minimum 8 characters)
 *                 example: SecurePassword123!
 *               name:
 *                 type: string
 *                 description: User full name (optional)
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input or validation error
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
 *                   example: Invalid email format
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/register', registerHandler);
```

### POST /api/v1/auth/login:
```typescript
/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate user with email and password. Returns JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: SecurePassword123!
 *     responses:
 *       200:
 *         description: User successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginHandler);
```

---

## File 4: `src/routes/users.routes.ts` (UPDATED)

JSDoc annotations added before route:

```typescript
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
```

---

## File 5: `src/routes/templates.routes.ts` (UPDATED)

Three endpoints documented:

### GET /api/v1/templates (Public):
```typescript
/**
 * @openapi
 * /api/v1/templates:
 *   get:
 *     tags:
 *       - Templates
 *     summary: Get public templates
 *     description: Retrieve all public prompt templates, optionally filtered by role tag
 *     parameters:
 *       - name: roleTag
 *         in: query
 *         description: Filter templates by role tag (e.g., developer, marketer, writer)
 *         schema:
 *           type: string
 *         example: developer
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getPublicTemplatesHandler);
```

### POST /api/v1/templates (Protected):
```typescript
/**
 * @openapi
 * /api/v1/templates:
 *   post:
 *     tags:
 *       - Templates
 *     summary: Create a new template
 *     description: Create a new prompt template (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - roleTag
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Template title
 *                 example: Email Marketing Prompt
 *               description:
 *                 type: string
 *                 description: Template description (optional)
 *                 example: Generate professional email marketing copy
 *               roleTag:
 *                 type: string
 *                 minLength: 1
 *                 description: Role or category tag
 *                 example: marketer
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: Template content with {{placeholders}}
 *                 example: 'Write a {{tone}} email for {{audience}} about {{topic}}'
 *               isPublic:
 *                 type: boolean
 *                 description: Whether template is publicly available (optional, default true)
 *                 example: true
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       400:
 *         description: Invalid template data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, createTemplateHandler);
```

### DELETE /api/v1/templates/{id} (Protected):
```typescript
/**
 * @openapi
 * /api/v1/templates/{id}:
 *   delete:
 *     tags:
 *       - Templates
 *     summary: Delete a template
 *     description: Delete a template by ID (only template owner or admin can delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Template ID
 *         schema:
 *           type: string
 *         example: template_123abc
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Template deleted successfully
 *       400:
 *         description: Invalid template ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - You don't have permission to delete this template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticate, deleteTemplateHandler);
```

---

## File 6: `src/routes/prompts.routes.ts` (UPDATED)

### POST /api/v1/prompts/build (Protected):
```typescript
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
router.post('/build', buildPromptHandler);
```

---

## Testing the Integration

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Access Swagger UI:**
   - Navigate to: `http://localhost:5000/api-docs`

3. **Test an endpoint:**
   - Expand any endpoint
   - Click "Try it out"
   - Fill in request data
   - Click "Execute"

4. **Test protected endpoints:**
   - Click "Authorize" button (top-right)
   - Paste a JWT token from login response
   - Now test protected endpoints

---

## Customization Tips

### Change API Title/Version:
Edit `src/config/swagger.ts`:
```typescript
info: {
  title: 'Your API Title',
  version: '2.0.0',
}
```

### Add More Servers:
```typescript
servers: [
  { url: 'http://localhost:5000', description: 'Development' },
  { url: 'https://staging-api.example.com', description: 'Staging' },
  { url: 'https://api.example.com', description: 'Production' },
]
```

### Customize Swagger UI Styling:
Edit `src/server.ts`:
```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `.swagger-ui .topbar { background: #1a1a1a; }`,
  customSiteTitle: 'Your Custom Title',
}));
```

### Add New Endpoints:
1. Add the route in your route file
2. Add JSDoc annotations using the same pattern
3. Update the `apis` array in `swagger.ts` if it's a new file

---

## Schema Reference

### User Schema:
```typescript
{
  id: "user_123abc",
  email: "john@example.com",
  name: "John Doe",
  role: "USER",
  createdAt: "2026-06-24T10:00:00Z"
}
```

### Template Schema:
```typescript
{
  id: "template_123abc",
  title: "Email Marketing Prompt",
  description: "Generate professional email marketing copy",
  roleTag: "marketer",
  content: "Write a {{tone}} email for {{audience}} about {{topic}}",
  isPublic: true,
  authorId: "user_123abc",
  createdAt: "2026-06-24T10:00:00Z"
}
```

### AuthResponse Schema:
```typescript
{
  status: "success",
  data: {
    user: { /* User schema */ },
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🎉 You're all set!

Your Swagger documentation is now live and fully integrated with your Express backend.
