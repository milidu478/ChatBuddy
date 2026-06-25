import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getHierarchyTreeHandler,
  // Domains
  getDomainsHandler,
  getDomainByIdHandler,
  createDomainHandler,
  updateDomainHandler,
  deleteDomainHandler,
  // Professions
  getProfessionsHandler,
  getProfessionByIdHandler,
  createProfessionHandler,
  updateProfessionHandler,
  deleteProfessionHandler,
  // Roles
  getRolesHandler,
  getRoleByIdHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
  // Specializations
  getSpecializationsHandler,
  getSpecializationByIdHandler,
  createSpecializationHandler,
  updateSpecializationHandler,
  deleteSpecializationHandler,
  // Templates
  getTemplatesHandler,
  getTemplateByIdHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler
} from '../controllers/prompt-hierarchy.controller.js';

const router = Router();

// 1. Nested Tree Hierarchy
router.get('/tree', getHierarchyTreeHandler);

// 2. Domains
router.get('/domains', getDomainsHandler);
router.get('/domains/:id', getDomainByIdHandler);
router.post('/domains', authenticate, createDomainHandler);
router.put('/domains/:id', authenticate, updateDomainHandler);
router.delete('/domains/:id', authenticate, deleteDomainHandler);

// 3. Professions
router.get('/professions', getProfessionsHandler);
router.get('/professions/:id', getProfessionByIdHandler);
router.post('/professions', authenticate, createProfessionHandler);
router.put('/professions/:id', authenticate, updateProfessionHandler);
router.delete('/professions/:id', authenticate, deleteProfessionHandler);

// 4. Roles
router.get('/roles', getRolesHandler);
router.get('/roles/:id', getRoleByIdHandler);
router.post('/roles', authenticate, createRoleHandler);
router.put('/roles/:id', authenticate, updateRoleHandler);
router.delete('/roles/:id', authenticate, deleteRoleHandler);

// 5. Specializations
router.get('/specializations', getSpecializationsHandler);
router.get('/specializations/:id', getSpecializationByIdHandler);
router.post('/specializations', authenticate, createSpecializationHandler);
router.put('/specializations/:id', authenticate, updateSpecializationHandler);
router.delete('/specializations/:id', authenticate, deleteSpecializationHandler);

// 6. Templates
router.get('/templates', getTemplatesHandler);
router.get('/templates/:id', getTemplateByIdHandler);
router.post('/templates', authenticate, createTemplateHandler);
router.put('/templates/:id', authenticate, updateTemplateHandler);
router.delete('/templates/:id', authenticate, deleteTemplateHandler);

export default router;
