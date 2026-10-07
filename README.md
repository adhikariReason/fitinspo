# Fit Inspo by Kristina

An Amazon Associates affiliate blog for outfit inspiration, built to the spec in
[`../files/BUILD_SPEC.md`](../files/BUILD_SPEC.md).

Each look is one page listing every piece in the outfit with its own affiliate
link, so a single Pinterest pin can point at a whole outfit.

- **Astro** static site, no server and no database
- **GitHub Pages** hosting, deployed by GitHub Actions on every push to `main`
- **Decap CMS** at `/admin`, which commits looks to this repo as Markdown

## Run it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:4321>. The design is a 390px phone, so use your
browser's device toolbar (iPhone 14 / 390×844) to see it as the mockups look.

Pages worth visiting: `/`, `/looks/brown-cream-coffee-date-outfit/`, `/swipe/`,
`/saved/`, `/disclosure/`, `/category/coffee-date/`, `/tag/brown-and-cream/`.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run check` | Type-check the Astro and TypeScript files |

## How content works

One look is one Markdown file in `src/content/looks/`. The frontmatter schema
lives in [`src/content.config.ts`](src/content.config.ts) and is validated at
build time, so a malformed look fails the build instead of shipping broken.

The `slug` field — not the filename — is the page's URL. **Never change it once
a look is published**, because pins link to it forever. Renaming the file is
safe; changing `slug` is not.

Set `draft: true` to keep a look out of the built site.

### The affiliate tag

Content files hold plain Amazon product URLs. The Associates tag is added at
build time by `amazonLink()`, from one constant:

```ts
// src/data/site.ts
export const AMAZON_TAG = 'yourtag-20';
```

**Replace that with the real tag before launch.** Nothing else needs touching.

### Categories

Categories are configured in `src/data/site.ts` and nothing else. Adding one
there gives it a chip on the home feed, a `/category/<slug>/` page, a slot in
the swipe browser's vertical axis, and an option in the CMS dropdown — except
the CMS dropdown, which is a static list in `public/admin/config.yml` and has to
be updated to match.

## Editing with the CMS

### Locally (no setup)

In two terminals:

```bash
npx decap-server
```

```bash
npm run dev
```

Then open <http://localhost:4321/admin/>. `local_backend: true` in
`public/admin/config.yml` makes Decap write to your working copy, so you can
try it without any GitHub configuration.

### In production (one-time setup)

Decap's GitHub backend cannot complete OAuth from the browser alone, so it needs
a small OAuth proxy. Before `/admin/` works on the live site:

1. Create a GitHub OAuth app (Settings → Developer settings → OAuth Apps).
2. Deploy an OAuth proxy for it. Decap documents several; a Cloudflare Worker or
   Netlify function is the usual choice. Both are free at this traffic level.
3. In `public/admin/config.yml`, set `repo:` to your `owner/repo` and `base_url:`
   to the proxy's URL.

Until then, looks can be added by committing Markdown files directly.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. One-time setup in the repo: **Settings → Pages →
Source → GitHub Actions**.

### Two things to decide before launch

1. **The domain.** `astro.config.mjs` (`site:`), `public/CNAME` and
   `public/robots.txt` all currently say `fitinspobykristina.com`, which has not
   been checked for availability. Update all three, or delete `public/CNAME` to
   serve from the `github.io` URL.
2. **Private repo vs. free Pages.** GitHub Pages only serves from a *private*
   repo on a paid plan (Pro/Team or above). On the free plan the repo has to be
   public for the site to be published. Since the content here is destined to be
   public anyway, a public repo is the cheaper option — but it is a real choice,
   not an oversight.

## Layout

```
src/
  content.config.ts        Frontmatter schema for a look
  content/looks/*.md       One file per look
  data/site.ts             Brand, categories, affiliate tag  <- edit this
  data/looks.ts            Queries: all, by category, by tag, related
  styles/global.css        Design tokens (spec section 6) and all shared CSS
  scripts/saves.ts         localStorage saved looks
  scripts/swipe.ts         Two-way swipe gesture logic
  layouts/Base.astro       <head>, shell, footer, save wiring
  components/              Masthead, LookTile, SaveButton, Feed, Pager, ...
  pages/
    index.astro            Home feed, page 1
    page/[page].astro      Home feed, pages 2+
    looks/[slug].astro     A look post
    category/[category].astro
    tag/[tag].astro
    swipe.astro            Swipe browser
    saved.astro            Saved looks (localStorage)
    disclosure.astro
    search.astro           Stub until Pagefind is wired in
    404.astro
public/
  admin/                   Decap CMS
  images/looks/            Hero images (CMS uploads land here)
  CNAME, robots.txt
```

## Still to do

Deliberately left for later, per the spec:

- **Search.** The field and `/search/` page exist but are not wired to an index.
  Adding Pagefind is the remaining work; nothing else has to change.
- **Real photos and Amazon links.** The four sample looks use generated SVG
  placeholders at `public/images/looks/` and `PLACEHOLDER` product URLs.
- **The affiliate tag**, the domain, and the final category list.

## Accessibility and SEO notes

Every image has alt text, touch targets are at least 44px, focus is visible, the
swipe browser is fully operable with the arrow keys and buttons and respects
`prefers-reduced-motion`, and each look post emits `Article` JSON-LD. Canonical
URLs, Open Graph images and `sitemap-index.xml` come from `site:` in
`astro.config.mjs`. `/saved/`, `/search/` and `/swipe/` are `noindex` and are
excluded from the sitemap.

No prices appear anywhere on the site, per the Amazon Associates terms. The
required disclosure sentence is in the template, not in the content files, so it
cannot be left off a look.
