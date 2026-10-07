import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The production URL. Change this (and public/CNAME) once the domain is confirmed.
// It is used for canonical URLs, Open Graph images and sitemap.xml.
export default defineConfig({
  site: 'https://fitinspobykristina.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Keep the per-browser and not-yet-built pages out of the index.
      filter: (page) => !/\/(saved|search|swipe)\/$/.test(page),
    }),
  ],
});
