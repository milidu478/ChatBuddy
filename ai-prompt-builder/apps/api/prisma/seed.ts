import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with 5-Level Prompt Hierarchy...');

  // 1. Create/Upsert Test User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
    },
  });

  console.log(`  - Test user: ${testUser.email}`);

  // 2. Clean existing hierarchical data to prevent duplicate seeds
  // Prisma will cascade deletes, so deleting Domains deletes everything!
  await prisma.domain.deleteMany({});
  console.log('  - Cleared old hierarchical data');

  // 3. Seed Domain 1: Software Engineering
  const devDomain = await prisma.domain.create({
    data: {
      name: 'Software Engineering',
    },
  });

  // Domain 1 -> Profession 1: Developer
  const developerProfession = await prisma.profession.create({
    data: {
      name: 'Developer',
      domainId: devDomain.id,
    },
  });

  // Profession 1 -> Role 1: Frontend Developer
  const frontendRole = await prisma.role.create({
    data: {
      name: 'Frontend Developer',
      professionId: developerProfession.id,
    },
  });

  // Role 1 -> Specializations
  const reactSpec = await prisma.specialization.create({
    data: {
      name: 'React & Next.js',
      roleId: frontendRole.id,
    },
  });

  const stateSpec = await prisma.specialization.create({
    data: {
      name: 'State Management',
      roleId: frontendRole.id,
    },
  });

  // Specialization -> Templates
  await prisma.template.createMany({
    data: [
      {
        name: 'Next.js Performance Optimizer',
        promptText: 'Act as a senior React and Next.js performance expert. Analyze the following code for unnecessary re-renders, slow server-side rendering, or layout shifts. Offer concrete optimizations:\n\n{{code}}',
        specializationId: reactSpec.id,
      },
      {
        name: 'Tailwind CSS Component Styler',
        promptText: 'Act as a premium UI/UX frontend engineer. Styling with Tailwind CSS, create a modern, responsive, glassmorphic component for a {{componentType}}. Ensure it has hover effects and beautiful dark mode support.',
        specializationId: reactSpec.id,
      },
      {
        name: 'Zustand Store Generator',
        promptText: 'Act as a React architect. Write a fully typed Zustand store in TypeScript for managing {{featureState}}. Include actions for adding, updating, and deleting items, with persistent middleware.',
        specializationId: stateSpec.id,
      },
    ],
  });

  // Profession 1 -> Role 2: Backend Developer
  const backendRole = await prisma.role.create({
    data: {
      name: 'Backend Developer',
      professionId: developerProfession.id,
    },
  });

  const expressSpec = await prisma.specialization.create({
    data: {
      name: 'Node.js & Express',
      roleId: backendRole.id,
    },
  });

  await prisma.template.create({
    data: {
      name: 'Express API Boilerplate',
      promptText: 'Act as a senior backend engineer. Generate a production-ready Express.js API router file in TypeScript for a "{{resourceName}}" resource. Include validation middleware, global error handling, and structured JSON responses.',
      specializationId: expressSpec.id,
    },
  });

  // 4. Seed Domain 2: Digital Marketing
  const marketingDomain = await prisma.domain.create({
    data: {
      name: 'Digital Marketing',
    },
  });

  // Domain 2 -> Profession 1: Content Writer
  const writerProfession = await prisma.profession.create({
    data: {
      name: 'Content Writer',
      domainId: marketingDomain.id,
    },
  });

  // Profession 1 -> Role 1: Social Media Specialist
  const socialRole = await prisma.role.create({
    data: {
      name: 'Social Media Specialist',
      professionId: writerProfession.id,
    },
  });

  // Role 1 -> Specializations
  const linkedinSpec = await prisma.specialization.create({
    data: {
      name: 'LinkedIn Engagement',
      roleId: socialRole.id,
    },
  });

  const twitterSpec = await prisma.specialization.create({
    data: {
      name: 'Twitter Threads',
      roleId: socialRole.id,
    },
  });

  // Specialization -> Templates
  await prisma.template.createMany({
    data: [
      {
        name: 'Viral Tech Industry Post',
        promptText: 'Act as a high-engagement LinkedIn copywriter. Write a compelling, hook-first post discussing the impact of {{technology}} on {{industry}}. End with a strong conversation-starting question.',
        specializationId: linkedinSpec.id,
      },
      {
        name: 'Technical Explainer Thread',
        promptText: 'Act as a world-class technical educator. Write an engaging 5-tweet Twitter thread explaining the concept of "{{concept}}" to a beginner. Use analogies and keep each tweet under 240 characters.',
        specializationId: twitterSpec.id,
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
  console.log('\nReady for testing:');
  console.log('  Email: test@example.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
