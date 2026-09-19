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

The integration tests check seven routes, document landmarks, internal links, image alternatives, and asset destinations. Geometry tests verify that batching preserves nested transforms, interactive objects, shared geometry, transparency, and shadow behavior. Cat asset tests decode the actual GLB, validate geometry and animation groups, and enforce a 45,000-triangle, 10-draw-call, 1.1 MB total download budget. Browser verification covers all five project dialogs, menu navigation, Escape, the notebook, about, cat close-up, seated camera, sound toggle, and phone layout. Menu closure restores the prior camera position.

## Exploring the diner

Drag to orbit; scroll or pinch to zoom. “Take a seat” moves inside the counter. Click the physical menu or its labeled hotspot to browse projects. The notebook holds side projects, the portrait opens the introduction, the record player toggles an original synthesized lounge-and-rain soundscape, and the cat responds to a greeting. Sound starts muted.

All important actions have keyboard-accessible controls. Dialogs trap focus, return focus when closed, and support Escape. Reduced-motion preferences disable decorative animation and camera transitions. `/work/` and individual project pages provide the complete portfolio without JavaScript or WebGL.

## Source

- `src/diner/models.ts`: original room geometry, props, lights, and interactive targets.
- `src/diner/textures.ts`: procedural wood, tiles, menu, signs, analog gauge, foliage and labels.
- `src/diner/cat.ts`: parallel loading and material setup for the original white cat.
- `scripts/build-cat.mjs`: offline cat sculpt, texture baking, batching and GLB export.
- `src/diner/scene.ts`: rendering, orbit controls, raycasting, camera transitions, motion.
- `src/diner/ui.ts`: accessible dialogs and room controls.
- `src/diner/audio.ts`: opt-in original synthesized ambience.
- `src/data/projects.ts`: project content adapted from the original portfolio.
- `src/pages/index.astro`: diner interface and project dialogs.
- `src/pages/work/`: complete static portfolio and project pages.
- `src/styles/diner.css`: responsive interface and paper menu styling.
- `archive/previous-site`: the previous site, preserved unchanged.

## Assets

The room uses original geometry and procedural textures; no downloaded third-party models or external rendering services. The white cat is an original continuous-surface sculpt, generated offline and committed as a quantized GLB with compact WebP coat and fur textures. Its body, head and ears remain independent for animation; the cushion stays still. Regenerate it with `npm run build:cat`. The complete cat and its textures total approximately 1 MB, with 40,636 triangles and nine material batches. No sculpting or texture baking runs in the browser. Existing artwork, portraits, and project images come from the prior portfolio. Instrument Serif, DM Sans, and DM Mono are served locally with their licenses in `public/fonts`.

The earlier AI-generated counter image is retained only as the WebGL failure fallback; it is not downloaded during normal startup. It is a conceptual scene, not a photograph of Felix’s home or pet. It was generated with OpenAI’s image generation tool and encoded as WebP. Audio is generated locally using Web Audio and contains no sampled music.

## Rendering and performance

The room batches static geometry by shared material while keeping interactive and animated objects separate. Native antialiasing replaces full-screen postprocessing, shadow maps are reused, and the renderer limits total pixel count and adapts resolution when camera movement remains slow.

Camera movement uses animation frames. Ambient animation is capped at 24 updates per second, and rendering stops when the page is hidden or a reading dialog has finished opening. Reduced-motion mode renders only on changes. Audio suspends when hidden or muted, and its temporary nodes are disconnected after playback.

Measured in the same local browser room view during the September 2026 polish passes:

| Rendering measure | Initial room | First optimization | White cat and detailed props |
| --- | ---: | ---: | ---: |
| Draw calls per frame | 471 | 121 | 85 |
| GPU geometries | 449 | 112 | 76 |
| Rendered triangles | 103,986 | 88,064 | 131,362 |

The new sculpt deliberately spends more triangles on curved surfaces, while batching rigid parts within the interactive props reduces draw calls by another 30%. The latest browser walkthrough covered 1440 × 900 and 390 × 844 layouts, cat orbit views, all five project dialogs, notebook/about, sound, and paused rendering during reading. The complete automated suite has 22 passing checks when run with the local preview.

These measure rendering work, not a promised frame-rate improvement on every device. In development, the canvas exposes a frame counter for verifying that dialogs stop rendering; production builds omit it. The 3D engine is loaded separately from the small navigation script, and the static portfolio does not load it.
