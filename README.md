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

The integration tests check seven routes, document landmarks, internal links, image alternatives, and asset destinations. Browser verification covers all five project dialogs, menu navigation, Escape, the notebook, about, cat close-up, seated camera, sound toggle, and phone layout.

## Exploring the diner

Drag to orbit; scroll or pinch to zoom. “Take a seat” moves inside the counter. Click the physical menu or its labeled hotspot to browse projects. The notebook holds side projects, the portrait opens the introduction, the record player toggles an original synthesized lounge-and-rain soundscape, and the cat responds to a greeting. Sound starts muted.

All important actions have keyboard-accessible controls. Dialogs trap focus, return focus when closed, and support Escape. Reduced-motion preferences disable decorative animation and camera transitions. `/work/` and individual project pages provide the complete portfolio without JavaScript or WebGL.

## Source

- `src/diner/models.ts`: original room geometry, props, lights, and interactive targets.
- `src/diner/textures.ts`: procedural wood, tiles, menu, signs, and labels.
- `src/diner/scene.ts`: rendering, orbit controls, raycasting, camera transitions, motion.
- `src/diner/ui.ts`: accessible dialogs and room controls.
- `src/diner/audio.ts`: opt-in original synthesized ambience.
- `src/data/projects.ts`: project content adapted from the original portfolio.
- `src/pages/index.astro`: diner interface and project dialogs.
- `src/pages/work/`: complete static portfolio and project pages.
- `src/styles/diner.css`: responsive interface and paper menu styling.
- `archive/previous-site`: the previous site, preserved unchanged.

## Assets

The room is real-time geometry with procedural textures; no downloaded 3D models or external rendering services. Existing artwork, portraits, and project images come from the prior portfolio. Instrument Serif, DM Sans, and DM Mono are served locally with their licenses in `public/fonts`.

The earlier AI-generated counter image is retained only as the loading/WebGL fallback. It is a conceptual scene, not a photograph of Felix’s home or pet. It was generated with OpenAI’s image generation tool and encoded as WebP. Audio is generated locally using Web Audio and contains no sampled music.
