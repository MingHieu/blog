import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const mobile = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/mobile' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    category: z.string().optional().default('mobile'),
    image: z.string().optional(),
  }),
});

export const collections = {
  mobile: mobile,
};
