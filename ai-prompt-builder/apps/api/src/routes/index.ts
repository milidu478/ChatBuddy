import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import promptsRoutes from './prompts.routes.js';
import promptHierarchyRoutes from './prompt-hierarchy.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/prompts', promptsRoutes);

// 5-Level Prompt Hierarchy CRUD and Tree Routes
router.use('/', promptHierarchyRoutes); // This mounts /domains, /professions, /roles, /specializations, /templates, and /tree at the root level (e.g. /api/v1/domains)
router.use('/prompt-hierarchy', promptHierarchyRoutes); // Mounts /prompt-hierarchy/tree as well for convenience
export default router;










