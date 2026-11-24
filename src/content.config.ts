import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    volume: z.enum(['mysql', 'redis', 'juc', 'spring']),
    order: z.number().default(99),
    frequency: z.enum(['高频必问', '常考进阶', '加分亮点']).default('高频必问'),
    readTime: z.string().default('4 min'),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    updatedAt: z
      .union([z.string(), z.date()])
      .transform((val) => (val instanceof Date ? val.toISOString().slice(0, 10) : val))
      .optional(),
  }),
});

export const collections = { notes };
