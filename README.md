# After Hours

Yifei Felix Wang's personal portfolio. A first exploration of a late-night chef's counter: an atmospheric introduction, a menu of selected projects, side interests, and readable project pages.

## Local development

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

## Validation

```sh
npm run build
npm test
```

The integration tests check all project routes, document landmarks, internal links, image alternatives, and asset destinations in the production output.

## Content

- `src/data/projects.ts`: project descriptions and metadata, adapted from the prior portfolio.
- `src/pages/index.astro`: homepage, side projects, and personal details.
- `src/pages/work/[slug].astro`: project pages.
- `src/styles/global.css`: visual system and responsive layouts.
- `public/images`: optimized project images and original atmosphere artwork.
- `archive/previous-site`: the previous site, preserved unchanged.

The website uses local fonts and static pages. The cat greeting and subtle scene tilt are optional enhancements. Reduced-motion preferences disable motion; the work remains accessible without JavaScript.

## Artwork

The counter scene at `public/images/after-hours-counter.webp` was generated with OpenAI's built-in image generation tool, then resized and encoded as WebP. It is a conceptual scene, not a photograph of Felix's home or pet.

Art brief: a wide 3:2 scene for an After Hours chef's counter / creative studio, dark espresso backdrop, warm amber light from a burgundy mushroom lamp, sleeping cream-and-orange cat, espresso, burgundy notebook, and a handheld game device. Slightly elevated three-quarter view, tactile wood and physical shadows, dark edges, no text or logos.

Existing project images belong to the prior portfolio. Google Fonts: Instrument Serif, DM Sans, and DM Mono, served locally under their Open Font Licenses in `public/fonts`.
