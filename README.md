# After Hours

Felix Wang’s personal portfolio, built as an interactive midnight diner with Astro and Three.js.

## Local development

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

## Validation

```sh
npm run check
npm run build
npm test
SITE_PREVIEW_URL=http://127.0.0.1:4321 npm test
```

The complete suite has 27 checks when a local preview is supplied. Integration checks cover seven routes, document landmarks, internal links, image alternatives and asset destinations. Geometry checks protect nested transforms, interactive objects, shared geometry, transparency, shadows, quantized attributes and independent distance detail levels. Asset checks decode all six actual GLBs and enforce geometry and delivery budgets. The production build retains Vite's large-chunk advisory for the separately loaded Three.js scene.

## Exploring the diner

Drag to orbit; scroll or pinch to zoom. “Take a seat” moves inside the counter. Click the physical menu or its labeled hotspot to browse projects. The notebook holds side projects, the portrait opens the introduction, the record player toggles an original synthesized lounge-and-rain soundscape, and the cat responds to a greeting. Sound starts muted.

All important actions have keyboard-accessible controls. Dialogs trap focus, return focus when closed, and support Escape. Reduced-motion preferences disable decorative animation and camera transitions. `/work/` and individual project pages provide the complete portfolio without JavaScript or WebGL.

## Source

- `src/diner/models.ts`: room geometry, prop placement, lights and interactive targets.
- `src/diner/assets.ts`: parallel asset loading, shared textures and distance detail levels.
- `src/diner/cat.ts`: white cat, still cushion and breathing group.
- `src/diner/textures.ts`: original tiles, menu, signs and labels.
- `scripts/prepare-assets.mjs`: offline model optimization, texture compression and measured manifests.
- `src/diner/optimize.ts`: static geometry batching with transform and quantization handling.
- `src/diner/scene.ts`: rendering, orbit controls, raycasting, camera transitions and motion.
- `src/diner/ui.ts`: accessible dialogs and room controls.
- `src/diner/audio.ts`: opt-in synthesized ambience.
- `src/data/projects.ts`: project content adapted from the original portfolio.
- `src/pages/index.astro`: diner interface and project dialogs.
- `src/pages/work/`: complete static portfolio and project pages.
- `src/styles/diner.css`: responsive interface and paper menu styling.
- `archive/previous-site`: the previous site, preserved unchanged.

## Art direction and assets

Quality comes from consistent shapes, materials, scale and lighting. The white cat is the close-up character; other objects are designed to read at ordinary room distance. The compact espresso machine uses a single dial and handle, and background normal maps are softened to avoid competing with the cat or menu.

Four selected Tripo models (cat, espresso machine, ramen and stool) share original visual references. The plant, kettle and walnut material use CC0 Poly Haven sources. Detailed credits, generation settings, reference prompts and local reproduction instructions are in [ASSET_CREDITS.md](ASSET_CREDITS.md). Reference images in `assets/references/` are production files and are not served to visitors. The API is used only during asset creation; the website requires no API key or external generation service.

All six optimized GLBs total approximately 3.31 MB, including both detail levels and their embedded textures. Runtime draws one level per object, and cloned props share geometry and materials. The cat uses a 2K texture set; background props use 512–1K textures. Original full-size models remain locally in ignored `work/`. Regeneration of web delivery files uses `npm run build:assets`, or `npm run build:cat` for the cat only; these commands never submit paid generation tasks.

The earlier AI-generated counter illustration is retained only as the WebGL-failure fallback and is not downloaded during normal startup. Existing artwork, portraits and project images come from the prior portfolio. Locally served fonts retain their licenses in `public/fonts`. Audio contains no sampled music.

## Rendering and performance

The room batches static geometry by shared material while preserving interactive objects and adaptive model levels. Native antialiasing replaces full-screen postprocessing, shadow maps are reused, and rendering limits total pixel count and adapts resolution during slow camera movement.

Camera movement uses animation frames. Ambient animation is capped at 24 updates per second; rendering stops when the page is hidden or a reading dialog has finished opening. Reduced-motion mode renders only on changes. Audio suspends when hidden or muted, and temporary audio nodes are disconnected after playback.

Measured in the local browser at the default 1440 × 900 room view:

| Rendering measure | Original room | Previous procedural cat | Current coherent asset pass |
| --- | ---: | ---: | ---: |
| Draw calls per frame | 471 | 85 | 82 |
| GPU geometries | 449 | 76 | 67 |
| Rendered triangles | 103,986 | 131,362 | 139,762 |

The final browser walkthrough covered desktop (1440 × 900) and phone (390 × 844) layouts, all five project stories, notebook/about, cat focus, sound toggling and paused rendering while reading. Reduced-motion guards were reviewed in code.

Distance detail keeps the improved models close to the prior room's geometry budget. Close views selectively increase detail. These numbers measure rendering work, not guaranteed frame rates across devices. Development exposes a canvas frame counter for verifying paused rendering; production omits it. The scene engine loads separately from the small navigation script, and static portfolio pages do not load it.
