import { defineCollection } from 'astro:content';
// `z` from 'astro:content' is deprecated and goes away in Astro 8.
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

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
    // Validated against the categories collection at build time by
    // assertCategoriesExist() in src/data/looks.ts, not here: the list of
    // categories is editable in the CMS, so it is not known to this schema.
    category: z.string(),
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

/**
 * Occasions. Editable in the CMS, which is why they are content rather than a
 * constant: adding one here gives it a chip, a listing page, a slot in the
 * swipe browser's vertical axis and an option on every look.
 */
const categories = defineCollection({
  loader: glob({
    pattern: '**/*.yml',
    base: './src/content/categories',
    generateId: ({ data, entry }) =>
      typeof data.slug === 'string' && data.slug ? data.slug : entry.replace(/\.yml$/, ''),
  }),
  schema: z.object({
    slug: z.string(),
    label: z.string(),
    /** Low numbers first. Sets chip order and the swipe browser's vertical order. */
    order: z.number().default(99),
  }),
});

export const collections = { looks, categories };
