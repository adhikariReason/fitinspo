import { defineCollection } from 'astro:content';
// `z` from 'astro:content' is deprecated and goes away in Astro 8.
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './data/site';

const item = z.object({
  name: z.string(),
  note: z.string(),
  amazon_url: z.string(),
});

const looks = defineCollection({
  // `slug` in the frontmatter is the permanent URL, so the entry id comes from
  // it rather than from the filename. Renaming a file never moves a page.
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/looks',
    generateId: ({ data, entry }) =>
      typeof data.slug === 'string' && data.slug ? data.slug : entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    category: z.enum(CATEGORY_SLUGS as unknown as [string, ...string[]]),
    tags: z.array(z.string()).default([]),
    note: z.string(),
    hero_image: z.string(),
    hero_alt: z.string(),
    /** Placeholder tint used behind the hero until a real photo is in place. */
    placeholder_bg: z.string().default('#E6D7C4'),
    placeholder_ink: z.string().default('#4B3224'),
    color_story: z.array(z.string()).default([]),
    color_story_label: z.string().optional(),
    intro: z.string(),
    items: z.array(item).min(1),
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { looks };
