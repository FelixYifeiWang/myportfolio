# Generated doorway visitors — September 20, 2026

Malenia and Lune are AI-generated fan interpretations, reviewed and optimized for a brief doorway appearance. They are not extracted game meshes. Characters belong to FromSoftware / Bandai Namco and Sandfall Interactive / Kepler respectively.

## Inputs and outputs

The built-in image-generation tool produced single-character standing references. Tripo then generated the static 3D models using `v3.1-20260211`, detailed geometry/PBR textures, `v3.5-20260815` textures, delight enabled, 40,000 requested faces, and model/texture seed 1919.

| Character | Reference file | Runtime model | Delivery size | Triangles |
|---|---|---|---:|---:|
| Malenia | `work/references/malenia-v1.png` | `public/models/visitors/malenia.glb` | 760,692 bytes | 38,066 |
| Lune | `work/references/lune-v1.png` | `public/models/visitors/lune.glb` | 587,012 bytes | 39,588 |

Paths are relative to `/Users/felixwang/Downloads/myportfolio`. Original generated GLBs and task receipts remain in ignored `work/tripo/`. Each output has one material, three 1024 px PBR textures, no runtime skeleton, and meshopt-compressed geometry. Models load only on interaction and are released after departure. Runtime materials use 45% normal-map strength and a 0.56 roughness floor to soften generated surface relief and harsh highlights; original geometry and colors remain unchanged.

Preparation: `node scripts/prepare-visitor.mjs <malenia|lune> work/tripo/<id>-v1.glb public/models/visitors/<id>.glb`.

Both first-generation candidates were accepted after four-direction visual inspection and doorway placement checks. Malenia is fitted uniformly to 2.67 scene units with a small lateral offset; Lune is 2.65 units. No regeneration or rigging charge was needed.

Tripo spending: 60 credits each, 120 total. Balance after completion: 580 credits, zero frozen.

## Reference sources

- Malenia official costume artwork, reproduced by [VideoArtGame](https://x.com/VideoArtGame/status/1528405327464505344); local source `work/references/malenia-source.jpg`.
- Lune character artwork by Alan Reynaud, reproduced in [80 Level's Expedition 33 article](https://80.lv/articles/clair-obscur-expedition-33-animator-shares-curated-animation-reel); local source `work/references/lune-source.jpg`.

## Final image-generation prompts

### Malenia

Create a clean single-character full-body 3D reference render of Malenia, Blade of Miquella from Elden Ring, faithfully using the attached official concept art as the identity/costume reference. For image-to-3D reconstruction. Exactly ONE character, centered, full helmet wings to both feet with 8% margin, nearly front facing with a slight 10-degree three-quarter turn. Plain light gray background, no text, no logos, no pedestal, no floor, no extra panels or props. Preserve iconic winged engraved antique-gold helmet covering the eyes with pale lower face visible, long scarlet hair, muted red cloak with fur collar, brown pleated dress over chainmail skirt, fine waist chains and belt, articulated gold prosthetic right arm and hand, pale left hand, gold prosthetic lower legs/feet. Natural slender adult human proportions, not toy/chibi. Both feet grounded, arms resting relaxed beside torso with a small gap, empty hands, no sword for this quiet doorway visit. Cloak and hair hang closely downward, not windblown or outstretched. High-quality coherent game character with medium geometric detail, costume forms and recognizable silhouette more important than microtexture. Soft even neutral lighting, metallic surfaces satin rather than glossy, no dramatic cast or baked shadows. Complete solid character, no missing limbs.

### Lune

Create one clean full-body 3D character reference image of Lune from Clair Obscur: Expedition 33, faithfully based on the attached official character render. This is an image-to-3D input, not a poster. Show exactly ONE character, front view with very slight three-quarter turn (10 degrees), from top of hair to bare toes, centered with 8% margin, on a plain light gray background, no text, no logos, no turnaround panels, no floor/base. Preserve her actual face, shoulder-length tousled black hair, tan skin, black asymmetric high-collar expedition coat with gold geometric embroidery, fitted black vest, gray inner collar, golden lapel accent, belts and book at hip, one full dark sleeve/glove on her right arm and exposed tattooed left forearm with gold bands; cropped dark trousers and bare feet with subtle markings. Natural adult human proportions, not chibi or anime. Pose: standing upright, both feet on same plane, arms relaxed down a little clear of the torso with hands empty, no floating pose, no magic effects. Coat hangs naturally, not spread wide. Medium-detail polished game character render, clear silhouette and crisp facial likeness, restrained material detail, coherent geometry. Neutral diffuse studio illumination, no strongly baked shadows or shiny highlights.
