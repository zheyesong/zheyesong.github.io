import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.string().default('Research interest'),
    focus: z.string(),
    order: z.number().int().default(0),
    featured: z.boolean().default(true),
  }),
});

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD publication date'),
    category: z.enum(['Research note', 'Reading note', 'Course project', 'Expository note']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
    order: z.number().int().default(0),
  }),
});

export const collections = { research, writing };
