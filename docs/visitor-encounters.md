# Doorway visitors

Local feature branch: `feature/door-visitors`. Preview: http://127.0.0.1:4330/. This iteration has not been deployed.

## Encounter

Each accepted door click plays **three recorded wooden knocks (0.625 seconds)** while preparing one random visitor. The leaf waits for both the sound and model, then opens inward to **35°** over 1.3 seconds, holds for 2.5 seconds, and closes over 1.3 seconds. Busy clicks do not restart the sound or queue another visitor. No automatic page-load knock remains. Each visitor can appear only once per page session. After all fourteen visits, the hotspot retires and clicking the door explains that everyone has stopped by. Refreshing starts a new roster. Cancelled or failed downloads do not consume a visitor.

The camera stays where the viewer put it. Escape and other item/seat navigation cancel the encounter; cancellation also stops the knock. Hidden pages stop the cue and close the encounter on resumption. Audio failure cannot block the doorway indefinitely. Music, rain, and purring keep their own controls and mix.

Door geometry tests check the stool, frame, threshold, and mat throughout the full swing. Visitors remain outside the leaf and exterior wall. A stencil aperture hides portions behind the jamb; a muted blue night gradient gives the opening depth without city scenery or another frame. A broad warm area light faces outward to make faces readable; it adds no shadow map and stays registered to avoid lighting shader churn. Some seated views naturally see less behind the door; no automatic reframing is used.

## Roster review — September 20

Every delivered model was reviewed from multiple angles. The table records actual fitted height in scene units. All scaling is uniform, with a shared 2.8-unit human-height ceiling and 1.42-unit doorway-width limit; models are never stretched to fit.

| Game | Visitor | Height | Review / decision |
|---|---|---:|---|
| Zelda | Link | 2.75 | Keep the recognizable tunic, face, and carried gear. Original asset unchanged. |
| Pokémon | Pikachu | 1.40 | Keep the small greeting pose and original proportions. Original asset unchanged. |
| Terraria | Eye of Cthulhu | 1.10 | Keep the floating eye, iris, veins, and trailing silhouette. Original asset unchanged. |
| Valorant | Chamber | 2.80 | Correct face, glasses, vest, and silhouette; duplicate source copy removed. |
| Warcraft | Arthas | 1.87 | Warcraft III proportions retained; omit projecting hammer and adjust placement so the jamb does not hide the face. |
| Persona 5 | Joker | 2.80 | Keep the Strikers model, mask, long coat, red gloves, and relaxed shoulders. |
| League of Legends | Azir | 1.25 | Small chibi interpretation, recognizable helmet and staff; omit the detached display disc. |
| Elden Ring | Ranni | 2.27 | Dressed model with recognizable hat, blue face, hair, and sleeves. Keep shoulders/hat behind the outside wall. |
| Fire Emblem: Three Houses | Byleth | 2.80 | Male Smash model; neutral face and original costume, arms relaxed. |
| Cyberpunk 2077 | Jackie Welles | 2.80 | Original clothed port; recognizable head and jacket. Slightly reduce the previous 2.85 height. |
| Disco Elysium | Kim Kitsuragi | 2.80 | Keep recognizable glasses and orange jacket; preserve glasses geometry during optimization. |
| Baldur’s Gate 3 | Astarion | 1.90 | Replace the inaccurate AI Shadowheart interpretation with Turbo Topology’s hand-sculpted chibi. Preserve vertex painting, hair, pointed ears, costume, and wine glass; remove display base. |
| Sekiro | Wolf | 2.70 | Add Dysnauss’s game-model port after rejecting crude low-poly candidates. Preserve face, topknot, prosthetic arm, scarf, and coat; relax shoulders and bake the rig. |
| Expedition 33 | Esquie | 1.83 | Small fan interpretation; keep round silhouette, mask, sun rays, and patterned coat. Replaces Lune, whose available source did not permit adaptations. |

Wolf and Astarion were checked in the actual doorway, as were the revised Arthas position and wider opening. Character recognizability still varies with lighting, viewing angle, and the deliberate partial occlusion of the peek.

## Performance

- No character downloads at page load; only the selected visitor loads on demand.
- Shown visitors release geometry, materials and textures as soon as the door closes. A two-model cache only retains unused/cancelled downloads, with in-flight request deduplication and disposal on eviction and teardown.
- Each asset is below 2 MiB and 50,000 triangles; textures are at most 1024 px. Astarion uses the artist’s vertex painting and needs no texture downloads.
- No skeleton or animation mixer runs in the browser. Static poses preserve source proportions.
- Holding uses the scene’s existing idle render rate; reduced motion skips the door swing.
- Geometry compression is selective. Link retains float positions to avoid flicker between closely layered clothes.
- The knock is a small local AAC file, loaded only on interaction.
- The night gradient uses 480 triangles and vertex colors, with no additional texture download. Doorway materials are configured before shader warm-up.

## Sources and preparation

Full author, source, and license notices are at `/visitor-credits/`, linked from View options. Listing terms do not establish ownership of underlying game characters; these are fan appearances, not officially licensed characters.

Recorded sound: [Knocking_Wooden_Door.wav by Islabonita](https://freesound.org/people/Islabonita/sounds/541492/), CC0. The first three taps were retained, the tail softened over 65 ms, and the result encoded as AAC. Source duration 1.592 seconds; delivered cue 0.625 seconds.

Generic converter: `node scripts/prepare-visitor.mjs <id> <source.glb> <output.glb>`. It preserves source materials/colors, bakes skinning, batches compatible geometry, compresses textures, and optionally uses meshopt. A regression test checks that multiple material primitives do not duplicate geometry.

Original downloads remain in Downloads or ignored `work/visitor-sources/`. Blender preparation recipes remain under `work/prepare-*.py` and `work/convert-ranni.py`. Blender runs with embedded scripts disabled. Ranni uses XPS conversion; Byleth uses DAE; Jackie uses SourceIO with rebuilt materials; Wolf uses the packed Blender port. Kim, Esquie, and Astarion are simplified offline. Astarion’s split chunks are welded before reduction to preserve seams.

Rejected sources are kept out of the random pool: the two featureless Wolf models; the AI Shadowheart interpretation; Kim’s broken v2 materials; unposed Joker exports. Lune and several BG3 ports prohibit adapted redistribution. Astarion and Wolf now fill those game slots without those sources.

## Verification

Final checks: TypeScript check and production build passed; all 170 tests passed. Desktop and narrow doorway previews were reviewed without browser errors. The build retains the existing large-bundle advisory.

Tests cover cue replay/order/cancellation/failure and late callbacks; encounter lifecycle, session-wide uniqueness, exhaustion and retry eligibility, reduced motion and disposal; physical clearances; uniform scale and human-height cap; delivery budgets; cache lifetime; and primitive baking. Run `npm run check`, `npm run build`, and `SITE_PREVIEW_URL=http://127.0.0.1:4321 npm test` against the static preview.

The dev-only `?visitor=<id>` query selects a registered visitor for visual review. Production always uses the random roster. Temporary model-review pages are removed before the final build.
