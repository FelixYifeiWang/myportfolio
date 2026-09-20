# Doorway visitors

Local feature branch: `feature/door-visitors`. Preview: http://127.0.0.1:4330/. This iteration has not been deployed.

## Encounter

Each accepted door click plays **three recorded wooden knocks (0.625 seconds)** while preparing one random visitor. The leaf waits for both the sound and model, then opens inward to **35°** over 1.3 seconds, holds for 2.5 seconds, and closes over 1.3 seconds. Busy clicks do not restart the sound or queue another visitor. No automatic page-load knock remains. Each visitor can appear only once per page session. After all thirteen visits, the hotspot retires and clicking the door explains that everyone has stopped by. Refreshing starts a new roster. Cancelled or failed downloads do not consume a visitor.

The camera stays where the viewer put it. Escape and other item/seat navigation cancel the encounter; cancellation also stops the knock. Hidden pages stop the cue and close the encounter on resumption. Audio failure cannot block the doorway indefinitely. Music, rain, and purring keep their own controls and mix.

Door geometry tests check the stool, frame, threshold, and mat throughout the full swing. Visitors remain outside the leaf and exterior wall. A stencil aperture hides portions behind the jamb; a muted blue night gradient gives the opening depth without city scenery or another frame. A physical plaster side wall separates the porch from the miniature scenery behind the window. Visitors stand 0.28 units farther outside, with individual framing for the Mime. A broad warm area light sits outside and faces directly outward to make faces readable without spilling through the interior wall; it adds no shadow map and stays registered to avoid lighting shader churn. Some seated views naturally see less behind the door; no automatic reframing is used.

## Roster review — September 20

Every delivered model was reviewed from multiple angles. The table records actual fitted height in scene units. All scaling is uniform, with a shared 2.8-unit human-height ceiling and 1.42-unit doorway-width limit; models are never stretched to fit.

| Game | Visitor | Height | Review / decision |
|---|---|---:|---|
| Zelda | Link | 2.75 | Keep the recognizable tunic, face, and carried gear. Original asset unchanged. |
| Pokémon | Pikachu | 1.40 | Keep the small greeting pose and original proportions. Original asset unchanged. |
| Terraria | Eye of Cthulhu | 1.10 | Keep the floating eye, iris, veins, and trailing silhouette. Original asset unchanged. |
| Valorant | Chamber | 2.80 | Correct face, glasses, vest, and silhouette; duplicate source copy removed. |
| Warcraft | Murloc | 1.65 | Replaces Arthas; textured fish creature with recognizable eyes, teeth, and fins, naturally smaller than a human. |
| Persona 5 | Joker | 2.80 | Keep the Strikers model, mask, long coat, red gloves, and relaxed shoulders. |
| League of Legends | Jinx | 2.65 | Replaces chibi Azir; Arcane/Fortnite interpretation, blue braids, human proportions, relaxed shoulders. |
| Elden Ring | Jar-Bairn | 1.15 | Replaces Ranni; small living jar with red lid and short limbs. Source mesh identifies Jar-Bairn, not the larger Alexander. |
| Fire Emblem: Three Houses | Byleth | 2.80 | Male Smash model; neutral face and original costume, arms relaxed. |
| Cyberpunk 2077 | Jackie Welles | 2.80 | Original clothed port; recognizable head and jacket. |
| Disco Elysium | Kim Kitsuragi | 2.80 | Keep recognizable glasses and orange jacket. |
| Sekiro | Wolf | 2.70 | Preserve face, topknot, prosthetic arm, scarf, and coat. |
| Expedition 33 | Mime | 2.55 | Replaces Esquie; wooden puppet face, striped shirt, red scarf. Standing pose baked from the source animation. |

Astarion is removed: the chibi model was not recognizable in the doorway. Researched BG3 alternatives were busts, printing models, or similarly weak interpretations; no replacement is included just to fill the slot. All five rejected assets are removed from public delivery and archived locally.

The four replacements were reviewed independently and in the actual doorway; Wolf was checked again after moving the shared placement. Doorway recognition still depends on viewing angle and the deliberate partial occlusion of the peek.

## Performance

- No character downloads at page load; only the selected visitor loads on demand.
- Shown visitors release geometry, materials and textures as soon as the door closes. A two-model cache only retains unused/cancelled downloads, with in-flight request deduplication and disposal on eviction and teardown.
- Each asset is below 2 MiB and 50,000 triangles; textures are at most 1024 px.
- No skeleton or animation mixer runs in the browser. Static poses preserve source proportions.
- Holding uses the scene’s existing idle render rate; reduced motion skips the door swing.
- Geometry compression is selective. Link retains float positions to avoid flicker between closely layered clothes.
- The knock is a small local AAC file, loaded only on interaction.
- The night gradient uses 480 triangles and vertex colors. The side wall adds two box meshes and reuses the existing plaster texture; no new exterior texture downloads or shadow maps. Doorway materials are configured before shader warm-up.

## Sources and preparation

Full author, source, and license notices are at `/visitor-credits/`, linked from View options. Listing terms do not establish ownership of underlying game characters; these are fan appearances, not officially licensed characters.

Recorded sound: [Knocking_Wooden_Door.wav by Islabonita](https://freesound.org/people/Islabonita/sounds/541492/), CC0. The first three taps were retained, the tail softened over 65 ms, and the result encoded as AAC. Source duration 1.592 seconds; delivered cue 0.625 seconds.

Generic converter: `node scripts/prepare-visitor.mjs <id> <source.glb> <output.glb>`. It preserves source materials/colors, bakes skinning, batches compatible geometry, compresses textures, and optionally uses meshopt. A regression test checks that multiple material primitives do not duplicate geometry.

Original downloads remain in Downloads or ignored `work/visitor-sources/`. Blender runs with embedded scripts disabled. Existing retained model recipes remain in `work/prepare-*.py`.

New replacements use `scripts/prepare-visitor.mjs`. Jinx and Murloc convert directly. Mime and Jar-Bairn first use `mime-raw` and `jar-raw` to bake the first source clip at 1.0 and 0.1 seconds, respectively; `work/simplify-door-visitors.py` reduces those static meshes to 46%, then a final `mime` or `jar` conversion compresses delivery geometry and textures. Baking before simplification avoids stretched limbs. Mime uses 768 px textures; the other new visitors use up to 1024 px. Final files are approximately 1.81, 1.00, 1.21, and 1.24 MiB for Jinx, Murloc, Mime, and Jar-Bairn.

Rejected sources include the former Azir, Esquie, Ranni, Arthas and Astarion; untextured Teemo/Maelle; head-only Mind Flayer; and the earlier featureless Wolf and inaccurate AI Shadowheart interpretations.

## Verification

Final checks: TypeScript check and production build passed; all 169 tests passed. The replacement models and actual desktop doorway previews were reviewed. The build retains the existing large-bundle advisory.

Tests cover cue replay/order/cancellation/failure and late callbacks; encounter lifecycle, session-wide uniqueness, exhaustion and retry eligibility, reduced motion and disposal; physical clearances and window-side wall occlusion; uniform scale and human-height cap; delivery budgets; cache lifetime; and primitive baking. Run `npm run check`, `npm run build`, and `SITE_PREVIEW_URL=http://127.0.0.1:4321 npm test` against the static preview.

The dev-only `?visitor=<id>` query selects a registered visitor for visual review. Production always uses the random roster. Temporary model-review pages are removed before the final build.
