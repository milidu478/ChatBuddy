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
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: 'user_123abc',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              nullable: true,
              description: 'User full name',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN'],
              description: 'User role',
              example: 'USER',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2026-06-24T10:00:00Z',
            },
          },
          required: ['id', 'email', 'role', 'createdAt'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                  description: 'JWT authentication token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique template identifier',
              example: 'template_123abc',
            },
            title: {
              type: 'string',
              description: 'Template title',
              example: 'Email Marketing Prompt',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Template description',
              example: 'Generate professional email marketing copy',
            },
            roleTag: {
              type: 'string',
              description: 'Role or category tag',
              example: 'marketer',
            },
            content: {
              type: 'string',
              description: 'Template content with {{placeholders}}',
              example: 'Write a {{tone}} email for {{audience}} about {{topic}}',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether template is publicly available',
              example: true,
            },
            authorId: {
              type: 'string',
              nullable: true,
              description: 'User ID of template author (null for system templates)',
              example: 'user_123abc',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Template creation timestamp',
              example: '2026-06-24T10:00:00Z',
            },
          },
          required: ['id', 'title', 'roleTag', 'content', 'isPublic', 'createdAt'],
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Authentication failed',
            },
          },
        },
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
