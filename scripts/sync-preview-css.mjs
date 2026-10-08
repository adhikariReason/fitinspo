/**
 * Copies the site's design tokens into the CMS so the editor's preview pane
 * looks like the real page.
 *
 * Decap loads its preview stylesheet over HTTP from the built site, so it
 * cannot import Astro's bundled CSS. Rather than keep a second copy by hand —
 * which would drift the first time a token changed — this regenerates it from
 * src/styles/global.css on every dev start and every build.
 *
 * The output is generated, not source: it is gitignored.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SOURCE = 'src/styles/global.css';
const TARGET = 'public/admin/preview.css';

const header = `/* GENERATED FILE — do not edit.
 * Copied from ${SOURCE} by scripts/sync-preview-css.mjs.
 * Edit the source file instead; this is rewritten on every dev start and build.
 */\n\n`;

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, header + readFileSync(SOURCE, 'utf8'));
console.log(`[preview-css] ${SOURCE} -> ${TARGET}`);
