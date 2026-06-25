import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';
import { prisma } from '../config/database.js';

// ============================================================================
// 1. NESTED TREE HIERARCHY
// ============================================================================

export const getHierarchyTreeHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tree = await prisma.domain.findMany({
      include: {
        professions: {
          include: {
            roles: {
              include: {
                specializations: {
                  include: {
                    templates: {
                      orderBy: { name: 'asc' }
                    }
                  },
                  orderBy: { name: 'asc' }
                }
              },
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ status: 'success', data: tree });
  } catch (error: any) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ============================================================================
// 2. DOMAIN CRUD
// ============================================================================

export const getDomainsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const domains = await prisma.domain.findMany({ orderBy: { name: 'asc' } });
    res.status(200).json({ status: 'success', data: domains });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDomainByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) {
      res.status(404).json({ status: 'error', message: 'Domain not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: domain });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createDomainHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Domain name is required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.domain.findUnique({ where: { name: trimmedName } });
    if (existing) {
      res.status(400).json({ status: 'error', message: `Domain "${trimmedName}" already exists.` });
      return;
    }

    const domain = await prisma.domain.create({ data: { name: trimmedName } });
    res.status(201).json({ status: 'success', data: domain });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateDomainHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Domain name is required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.domain.findUnique({ where: { name: trimmedName } });
    if (existing && existing.id !== id) {
      res.status(400).json({ status: 'error', message: `Another domain with name "${trimmedName}" already exists.` });
      return;
    }

    const domain = await prisma.domain.update({
      where: { id },
      data: { name: trimmedName }
    });
    res.status(200).json({ status: 'success', data: domain });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteDomainHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.domain.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Domain and descendants deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ============================================================================
// 3. PROFESSION CRUD
// ============================================================================

export const getProfessionsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { domainId } = req.query;
    const whereClause: any = domainId ? { domainId: String(domainId) } : {};
    const professions = await prisma.profession.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ status: 'success', data: professions });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getProfessionByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const profession = await prisma.profession.findUnique({ where: { id } });
    if (!profession) {
      res.status(404).json({ status: 'error', message: 'Profession not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: profession });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createProfessionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, domainId } = req.body;
    if (!name || !name.trim() || !domainId) {
      res.status(400).json({ status: 'error', message: 'Name and domainId are required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.profession.findFirst({
      where: { name: trimmedName, domainId }
    });
    if (existing) {
      res.status(400).json({ status: 'error', message: `Profession "${trimmedName}" already exists in this Domain.` });
      return;
    }

    const profession = await prisma.profession.create({
      data: { name: trimmedName, domainId }
    });
    res.status(201).json({ status: 'success', data: profession });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProfessionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, domainId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Profession name is required' });
      return;
    }

    const trimmedName = name.trim();
    
    // Get the current record to check/validate domainId
    const current = await prisma.profession.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ status: 'error', message: 'Profession not found' });
      return;
    }

    const targetDomainId = domainId || current.domainId;
    const existing = await prisma.profession.findFirst({
      where: { name: trimmedName, domainId: targetDomainId }
    });
    
    if (existing && existing.id !== id) {
      res.status(400).json({ status: 'error', message: `Another profession with name "${trimmedName}" already exists in this Domain.` });
      return;
    }

    const profession = await prisma.profession.update({
      where: { id },
      data: { name: trimmedName, domainId: targetDomainId }
    });
    res.status(200).json({ status: 'success', data: profession });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProfessionHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.profession.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Profession and descendants deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ============================================================================
// 4. ROLE CRUD
// ============================================================================

export const getRolesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { professionId } = req.query;
    const whereClause: any = professionId ? { professionId: String(professionId) } : {};
    const roles = await prisma.role.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ status: 'success', data: roles });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRoleByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      res.status(404).json({ status: 'error', message: 'Role not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: role });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createRoleHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, professionId } = req.body;
    if (!name || !name.trim() || !professionId) {
      res.status(400).json({ status: 'error', message: 'Name and professionId are required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.role.findFirst({
      where: { name: trimmedName, professionId }
    });
    if (existing) {
      res.status(400).json({ status: 'error', message: `Role "${trimmedName}" already exists in this Profession.` });
      return;
    }

    const role = await prisma.role.create({
      data: { name: trimmedName, professionId }
    });
    res.status(201).json({ status: 'success', data: role });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateRoleHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, professionId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Role name is required' });
      return;
    }

    const trimmedName = name.trim();
    const current = await prisma.role.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ status: 'error', message: 'Role not found' });
      return;
    }

    const targetProfessionId = professionId || current.professionId;
    const existing = await prisma.role.findFirst({
      where: { name: trimmedName, professionId: targetProfessionId }
    });

    if (existing && existing.id !== id) {
      res.status(400).json({ status: 'error', message: `Another role with name "${trimmedName}" already exists in this Profession.` });
      return;
    }

    const role = await prisma.role.update({
      where: { id },
      data: { name: trimmedName, professionId: targetProfessionId }
    });
    res.status(200).json({ status: 'success', data: role });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteRoleHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.role.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Role and descendants deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ============================================================================
// 5. SPECIALIZATION CRUD
// ============================================================================

export const getSpecializationsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roleId } = req.query;
    const whereClause: any = roleId ? { roleId: String(roleId) } : {};
    const specializations = await prisma.specialization.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ status: 'success', data: specializations });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSpecializationByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const specialization = await prisma.specialization.findUnique({ where: { id } });
    if (!specialization) {
      res.status(404).json({ status: 'error', message: 'Specialization not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: specialization });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createSpecializationHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, roleId } = req.body;
    if (!name || !name.trim() || !roleId) {
      res.status(400).json({ status: 'error', message: 'Name and roleId are required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.specialization.findFirst({
      where: { name: trimmedName, roleId }
    });
    if (existing) {
      res.status(400).json({ status: 'error', message: `Specialization "${trimmedName}" already exists in this Role.` });
      return;
    }

    const specialization = await prisma.specialization.create({
      data: { name: trimmedName, roleId }
    });
    res.status(201).json({ status: 'success', data: specialization });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateSpecializationHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, roleId } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ status: 'error', message: 'Specialization name is required' });
      return;
    }

    const trimmedName = name.trim();
    const current = await prisma.specialization.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ status: 'error', message: 'Specialization not found' });
      return;
    }

    const targetRoleId = roleId || current.roleId;
    const existing = await prisma.specialization.findFirst({
      where: { name: trimmedName, roleId: targetRoleId }
    });

    if (existing && existing.id !== id) {
      res.status(400).json({ status: 'error', message: `Another specialization with name "${trimmedName}" already exists in this Role.` });
      return;
    }

    const specialization = await prisma.specialization.update({
      where: { id },
      data: { name: trimmedName, roleId: targetRoleId }
    });
    res.status(200).json({ status: 'success', data: specialization });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteSpecializationHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.specialization.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Specialization and descendants deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ============================================================================
// 6. TEMPLATE CRUD
// ============================================================================

export const getTemplatesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { specializationId } = req.query;
    const whereClause: any = specializationId ? { specializationId: String(specializationId) } : {};
    const templates = await prisma.template.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ status: 'success', data: templates });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTemplateByIdHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      res.status(404).json({ status: 'error', message: 'Template not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: template });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createTemplateHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, promptText, specializationId } = req.body;
    if (!name || !name.trim() || !promptText || !promptText.trim() || !specializationId) {
      res.status(400).json({ status: 'error', message: 'Name, promptText, and specializationId are required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await prisma.template.findFirst({
      where: { name: trimmedName, specializationId }
    });
    if (existing) {
      res.status(400).json({ status: 'error', message: `Template "${trimmedName}" already exists in this Specialization.` });
      return;
    }

    const template = await prisma.template.create({
      data: { 
        name: trimmedName, 
        promptText: promptText.trim(), 
        specializationId 
      }
    });
    res.status(201).json({ status: 'success', data: template });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateTemplateHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, promptText, specializationId } = req.body;

    if (!name || !name.trim() || !promptText || !promptText.trim()) {
      res.status(400).json({ status: 'error', message: 'Name and promptText are required' });
      return;
    }

    const trimmedName = name.trim();
    const current = await prisma.template.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ status: 'error', message: 'Template not found' });
      return;
    }

    const targetSpecializationId = specializationId || current.specializationId;
    const existing = await prisma.template.findFirst({
      where: { name: trimmedName, specializationId: targetSpecializationId }
    });

    if (existing && existing.id !== id) {
      res.status(400).json({ status: 'error', message: `Another template with name "${trimmedName}" already exists in this Specialization.` });
      return;
    }

    const template = await prisma.template.update({
      where: { id },
      data: { 
        name: trimmedName, 
        promptText: promptText.trim(), 
        specializationId: targetSpecializationId 
      }
    });
    res.status(200).json({ status: 'success', data: template });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteTemplateHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.template.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
