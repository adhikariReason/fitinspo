import { getCollection, type CollectionEntry } from 'astro:content';

export type Look = CollectionEntry<'looks'>;
export type Category = { slug: string; label: string; order: number };

/**
 * Occasions, in display order. Read from the categories collection so they can
 * be added and renamed in the CMS without a code change.
 */
export async function allCategories(): Promise<Category[]> {
  const entries = await getCollection('categories');
  return entries
    .map((e) => ({ slug: e.data.slug, label: e.data.label, order: e.data.order }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Label for a category slug, falling back to the slug itself. */
export async function categoryLabel(slug: string): Promise<string> {
  return (await allCategories()).find((c) => c.slug === slug)?.label ?? slug;
}

/**
 * Fails the build if a look points at a category that does not exist, which the
 * frontmatter schema can no longer catch now that the list is editable content.
 * A silently unreachable look is worse than a build error.
 */
export async function assertCategoriesExist(): Promise<void> {
  const known = new Set((await allCategories()).map((c) => c.slug));
  const bad = (await allLooks())
    .filter((l) => !known.has(l.data.category))
    .map((l) => `  ${l.data.slug} -> "${l.data.category}"`);
  if (bad.length) {
    throw new Error(
      `These looks reference a category that does not exist in src/content/categories:\n${bad.join('\n')}\n` +
        `Known categories: ${[...known].join(', ')}`,
    );
  }
}

/** Every published look, newest first. Drafts are excluded from the build. */
export async function allLooks(): Promise<Look[]> {
  const looks = await getCollection('looks', ({ data }) => data.draft !== true);
  return looks.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function looksInCategory(category: string): Promise<Look[]> {
  return (await allLooks()).filter((l) => l.data.category === category);
}

/** Every tag in use, with its count, alphabetical. */
export async function allTags(): Promise<{ slug: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const look of await allLooks()) {
    for (const tag of look.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * "You might also like". Uses the explicit `related` list first, then fills up
 * from looks that share tags, then from the same category (spec 5b).
 */
export async function relatedLooks(look: Look, limit = 2): Promise<Look[]> {
  const pool = (await allLooks()).filter((l) => l.data.slug !== look.data.slug);
  const picked: Look[] = [];
  const take = (candidate: Look | undefined) => {
    if (!candidate) return;
    if (picked.length >= limit) return;
    if (picked.some((p) => p.data.slug === candidate.data.slug)) return;
    picked.push(candidate);
  };

  for (const slug of look.data.related) take(pool.find((l) => l.data.slug === slug));

  const tags = new Set(look.data.tags);
  const byTagOverlap = pool
    .map((l) => ({ look: l, score: l.data.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  for (const { look: l } of byTagOverlap) take(l);

  for (const l of pool.filter((l) => l.data.category === look.data.category)) take(l);
  for (const l of pool) take(l);

  return picked.slice(0, limit);
}

/** Looks per page on the home feed (spec 5a). */
export const PAGE_SIZE = 12;

export function pageSlice<T>(items: T[], page: number): { items: T[]; total: number } {
  const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total };
}
