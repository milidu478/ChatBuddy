import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { initSocketServer } from './socket.js';

const app = express();
const httpServer = createServer(app); // Express එක HTTP Server එකකට සම්බන්ධ කිරීම

// --- Middlewares ---
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json());

// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Prompt Builder API Docs',
}));

// --- API Routes ---
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'AI Prompt Builder API is running! 🚀',
    environment: config.env
  });
});

app.use('/api/v1', apiRoutes);

// --- Initialize Socket.io ---
initSocketServer(httpServer); // Socket සර්වර් එක ආරම්භ කිරීම

// --- Global Error Handler ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong on the server!'
  });
});

// --- Start Server ---
const PORT = config.port;
// app.listen වෙනුවට httpServer.listen පාවිච්චි කළ යුතුය
httpServer.listen(PORT, () => {
  console.log(`✅ Server & WebSockets running on http://localhost:${PORT}`);
});