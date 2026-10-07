import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Where the site is served from. Used for canonical URLs, Open Graph images
// and sitemap.xml. The domain must match public/CNAME and the Pages custom
// domain setting.
//
// `base` is '/' on a custom domain. Every internal link goes through `path()`
// in src/data/site.ts, so moving to or from a project-page sub-path only means
// changing these two lines.
export default defineConfig({
  site: 'https://fitinspobykristina.com',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Keep the per-browser and not-yet-built pages out of the index.
      filter: (page) => !/\/(saved|search|swipe)\/$/.test(page),
    }),
  ],
});
