/**
 * Single place for the values that change. Nothing else should hard-code these.
 */

/**
 * Amazon Associates tracking tag. Appended to every outgoing Amazon link at
 * render time by `amazonLink()`, so no link in the content files has to carry it.
 * Replace with the real tag before launch.
 */
export const AMAZON_TAG = 'yourtag-20';

export const SITE = {
  name: 'Fit Inspo by Kristina',
  wordmark: 'Fit Inspo',
  byline: 'by Kristina',
  description:
    'Outfit inspiration you can actually shop. Every look is broken down piece by piece, with a link for each one.',
  tiktok: 'https://www.tiktok.com/@fitinspo.co',
  pinterest: 'https://www.pinterest.com/crazychristina14/',
} as const;

/**
 * Occasions. These are also the vertical axis of the swipe browser, so the
 * order here is the order you swipe through. Add "Travel" etc. by adding a row.
 */
export const CATEGORIES = [
  { slug: 'coffee-date', label: 'Coffee date' },
  { slug: 'date-night', label: 'Date night' },
  { slug: 'work', label: 'Work' },
  { slug: 'weekend', label: 'Weekend' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

/** Turn a tag slug into something readable: `brown-and-cream` -> `brown and cream`. */
export function tagLabel(slug: string): string {
  return slug.replace(/-/g, ' ');
}

/**
 * Add (or replace) the Associates tag on an Amazon URL. Leaves non-Amazon and
 * malformed URLs alone rather than throwing during the build.
 */
export function amazonLink(url: string): string {
  try {
    const u = new URL(url);
    if (!/(^|\.)amazon\./.test(u.hostname)) return url;
    u.searchParams.set('tag', AMAZON_TAG);
    return u.toString();
  } catch {
    return url;
  }
}

/** Required verbatim by the Amazon Associates operating agreement. */
export const DISCLOSURE_SHORT =
  'Fit Inspo by Kristina is reader-supported. As an Amazon Associate, I earn from qualifying purchases.';
