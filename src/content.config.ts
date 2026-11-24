import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    volume: z.enum(['mysql', 'redis', 'juc', 'spring']),
    chapter: z.string().default('核心专题'),
    chapterOrder: z.number().optional(),
    order: z.number().default(99),
    tags: z.array(z.string()).default([]),
    updatedAt: z
      .union([z.string(), z.date()])
      .transform((val) => (val instanceof Date ? val.toISOString().slice(0, 10) : val))
      .optional(),
  }),
});

const chapterEntrySchema = z.union([
  z.string().transform((title) => ({ title: title.trim(), subtitle: undefined })),
  z.object({
    title: z.string().transform((t) => t.trim()),
    subtitle: z.string().optional(),
  }),
]);

const chapterConfigs = defineCollection({
  loader: glob({ pattern: '*/_chapters.{yaml,yml,json}', base: './src/content/notes' }),
  schema: z.object({
    chapters: z
      .array(chapterEntrySchema)
      .nullable()
      .optional()
      .transform((val) => val ?? []),
  }),
});

export const collections = { notes, chapterConfigs };
