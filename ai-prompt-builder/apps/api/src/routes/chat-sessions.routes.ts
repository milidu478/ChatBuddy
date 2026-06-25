import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  listChatSessionsHandler,
  createChatSessionHandler,
  getSessionMessagesHandler,
  createSessionMessageHandler,
  deleteChatSessionHandler,
  deleteAllChatSessionsHandler,
} from '../controllers/chat-sessions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listChatSessionsHandler);
router.post('/', createChatSessionHandler);
router.delete('/', deleteAllChatSessionsHandler);

router.get('/:id/messages', getSessionMessagesHandler);
router.post('/:id/messages', createSessionMessageHandler);
router.delete('/:id', deleteChatSessionHandler);

export default router;
