# Art direction and asset provenance

The diner uses a restrained indie-game vocabulary: rounded silhouettes, warm ivory, moss green, walnut and muted brass. Judge most objects at the normal room or seated distance. The white cat is the character close-up; background props should have broad readable shapes and quiet materials. More surface detail is not a quality goal.

## Generated models

Original reference images were made with OpenAI's built-in image generation tool, then converted to meshes with Tripo. Selected references are preserved in `assets/references/`; they are not downloaded by the website. The fictional cat is not a scan or portrait of an actual pet.

| Asset | Selected task | Direction |
| --- | --- | --- |
| White cat | `dcf11671-ffd0-434e-89dd-975eacf794e5` | Adult white cat curled asleep, head on paws, clear ears and muzzle, tail wrapped around body |
| Espresso machine | `c5ebd7db-6798-42ac-8ac2-27550993cb80` | Compact moss-green housing, ivory panel, one large dial and walnut handle; restrained brass accents |
| Ramen | `1c1d9f8a-2ec6-4f83-b4cf-d8da67c85640` | Speckled ceramic bowl, amber broth, egg, chashu, scallions and nori |
| Stool | `6a70a094-3b4c-467d-ada5-5c103d3d95d1` | Cognac leather seat, turned walnut legs, simple brass foot ring |

The first espresso task (`ba814442-b189-4168-bf06-72be78495ee2`) was rejected after room review: its two-group industrial design was too intricate for the scene. The replacement uses fewer forms and less than half its web-delivery bytes.

Generation settings: image-to-model `v3.1-20260211`, PBR enabled, detailed geometry and texture, texture version `v3.5-20260815`, delight enabled, model and texture seeds 1919. Face limits: cat 40,000; first espresso 24,000; selected espresso 12,000; ramen 18,000; stool 12,000. Those settings are an offline production choice, not a mandate for dense runtime meshes. Official API documentation: https://developers.tripo3d.ai/en/docs/generation-image-to-model/standard.

Five tasks consumed 60 credits each: 300 credits from the user's original 1,000-credit purchase ($3.00 of $10.00). Original model downloads and task records remain in the local ignored `work/tripo/` directory. Credentials remain in the ignored local `.env`; neither credentials nor signed download URLs belong in this document or the browser bundle.

## Downloaded sources

All three Poly Haven sources are [CC0](https://polyhaven.com/license).

| Source | Artist | Use / modifications |
| --- | --- | --- |
| [Potted Plant 02](https://polyhaven.com/a/potted_plant_02) | Rico Cilliers | Two instances; simplified geometry, smaller textures, distance detail levels |
| [Vintage Electric Kettle](https://polyhaven.com/a/vintage_electric_kettle) | SV Garip | Background prop; compressed textures and geometry, distance detail levels |
| [American Walnut Veneer](https://polyhaven.com/a/american_walnut_veneer) | Jenelle van Heerden | 1K color, OpenGL normal and roughness maps, WebP encoding, tinted and softened for the counter and woodwork |

Source downloads and prepared GLBs remain in ignored `work/`. The plant source was reduced to 36% of its original faces in Blender before the common delivery pass. Earlier BlenderKit experiments are not used by the current public models.

## Delivery and reproduction

`npm run build:assets` prepares the retained local source GLBs; it does not make paid API calls. `npm run build:cat` rebuilds only the cat. A fresh checkout can build and run the site directly from the committed optimized public assets. Re-running the offline conversion requires the local originals (`work/tripo/{cat-v1,espresso-v2,ramen-v1,stool-v1}.glb` and matching task records, plus `work/{plant,kettle}.glb`). Task IDs above identify the selected generations for recovering sources from the account.

The conversion deduplicates and welds geometry, makes two mesh levels sharing one texture set, encodes Meshopt geometry and WebP textures, and writes measured manifests beside each public GLB. Texture dimensions are 2K for the cat, 512 for foliage and the distant kettle, and 1K for the other props. Normal-map strength is deliberately reduced, particularly on the machine and stools. Runtime selects one level with hysteresis to avoid repeated switching near the threshold. All six GLBs together must remain under 3 MB; asset tests decode the actual files and enforce individual budgets.

## Reference prompt for the simplified espresso machine

Built-in imagegen, saved as `assets/references/espresso.png`:

> Use case: stylized-concept. Asset type: single isolated 3D model reference for a cozy midnight diner indie game. Primary request: an elegantly simplified compact vintage espresso machine with a strong rounded rectangular silhouette, broad clean moss-green enamel housing, warm ivory front panel, ONE large simple cream circular pressure dial at top center, ONE walnut-handled portafilter under the panel, one short steam wand to the right, plain brushed brass drip tray with just five broad slots. Wide rounded base with tiny feet. No cup, no accessory objects. Sophisticated restrained game art, tactile but quiet surfaces, smooth intentional curves, soft matte enamel, sparse brass accents, walnut handle. Forms must be instantly legible when only 70 pixels tall. This is a beautiful simplified prop, not an intricate industrial appliance: no tiny screws, no complex machinery, no multiple gauges, no shiny chrome, no dense grilles, no scratches or noise or distressing, no text or logos. Neutral light gray background, gentle diffuse neutral studio lighting with minimal cast shadow, three-quarter front view showing front and right side, entire object comfortably in frame. Clean coherent production art with softly painted materials, no photorealistic surface noise.

## Existing materials

Room architecture, smaller props, signs, menu textures and synthesized lounge/rain audio are original project work. Artwork, portraits and project screenshots come from the archived portfolio. Instrument Serif, DM Sans and DM Mono are served locally with licenses in `public/fonts`. The earlier AI-generated counter illustration remains only as the WebGL-failure fallback and is not fetched during normal 3D startup.

## Final room finishing pass

The entrance, ribbed-glass lettering, sconce, shelf ceramics, books, linen, recessed sink and rail supports are original procedural geometry. These use the existing room palette and static material batching. Furniture contact shadows are a single merged transparent batch with no depth writes; the sconce halo reuses the same radial texture. No additional Tripo generations were used. Total spending remains 300 credits ($3.00), leaving 700 credits ($7.00) at the last account check.

The plant's distant mesh was reduced from 15,918 to 5,985 triangles; its detailed mesh is unchanged for close views. Kettle textures were reduced to 512 pixels. Those two changes cut the model payload by 524,844 bytes. Four steam sprites replace nine, avoiding five draw calls without adding a particle engine or postprocessing.
