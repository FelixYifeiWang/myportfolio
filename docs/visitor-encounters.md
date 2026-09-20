# Doorway visitors

Local feature branch: `feature/door-visitors`. Not deployed. Preview: http://127.0.0.1:4330/.

## Current experience

Click the existing door. Download and prepare one visitor behind the closed leaf, open inward to **41.4°** over 1.3 seconds, hold for 6 seconds, then close before removing the visitor. The camera stays exactly where the viewer put it. Escape closes the encounter without leaving a seat or resetting the camera. Other item/seat navigation cancels the visit. No immediate repeat when multiple visitors are available.

The restricted swing clears the left stool throughout the motion. Some seated angles naturally see less of the doorway behind the leaf; there is deliberately no automatic reframing. The overview provides the clearest reveal.

Three visitors are accepted in the local preview:

| Visitor | Delivery size | Preparation | Source / credit |
|---|---:|---|---|
| Pikachu | 141,292 bytes | Original greeting pose baked, WebP textures, 4 material batches | [jacobjksn42](https://sketchfab.com/3d-models/pikachu-c22dab8fc3064c76a0c502d64555a74f), CC BY 4.0 |
| Link | 1,115,796 bytes | Legacy materials converted, arms relaxed, unattached duplicate sword/shield removed, skeleton baked, WebP textures | [雨宮レン](https://sketchfab.com/3d-models/link-breath-of-the-wild-32679eadce9f4b51a507aa5d6f03b1c5), CC BY 4.0 |
| Eye of Cthulhu | 572,992 bytes | Incorrectly opaque cornea omitted, static pose baked, floating placement, 2 material batches | [NO DONT EAT ME CASEOH](https://sketchfab.com/3d-models/eye-of-cthulhu-rig-06664c90cf3e4d24a74a43dc771ae74f), CC BY 4.0 |

Public artist credits live at `/visitor-credits/`, linked from View options. These listing licenses do not establish ownership of the underlying game characters; do not describe the assets as officially licensed characters.

## Performance and verification

- No character downloads on initial scene load; one selected model is loaded on interaction.
- Two-model cache, duplicate-download protection, disposal on eviction/teardown, retry after failure.
- All shipped visitors are below 2 MB, under 50k triangles, with textures at most 1024 px. No skeletons or animation mixers run in the browser.
- Holding the pose uses the normal idle render rate; reduced-motion visits use a low-frequency timer and skip the swing.
- Door motion invalidates static shadows. The hinge and exterior recess are excluded from whole-room batching.
- Link intentionally retains float positions: quantizing its closely layered clothes introduced visible flickering. The unquantized version was inspected again and is clean.
- Behavior tests cover lifecycle/cancellation/repeats, doorway clearance, stool clearance, asset budgets, fitting, and cache lifetime. Browser review checked the overview at desktop and narrow widths, and verified that opening and Escape preserve the turned seated view.
- Dev-only `?visitor=pikachu`, `?visitor=link`, or `?visitor=eye` selects one visitor for repeatable visual review. Production always uses the random roster.

## Reproduction

`node scripts/prepare-visitor.mjs <pikachu|link|eye> <original.glb> <output.glb>`

Original downloads are in Downloads; unaccepted/source candidates are under ignored `work/visitor-sources/`. The converter preserves original textures and normals, bakes skinning into a fixed pose, removes unused objects, batches compatible parts, and compresses textures.

Google sign-in works in both the in-app browser and the existing personal Chrome profile. **Use native Chrome via CUA for downloads**: its normal download flow saves GLBs into Downloads. The in-app browser's download event does not expose a usable local file; do not repeat the failed archive/pageAssets approaches or extract cookies.

## Remaining roster and rejected candidates

This is the first working group, not the complete requested roster. Still pending: Ranni, Wolf/Sekiro, Arthas, Jackie Welles, Azir, Chamber, Byleth (provisional replacement for Felix), Shadowheart, Joker, Lune, and Kim Kitsuragi.

- Kim by Andy B, [source](https://sketchfab.com/3d-models/lt-kim-kitsuragi-disco-elysium-a52477c40ebf48f594c28c9faf99b2c5): downloaded; alternate interpretation with a gun-aiming pose. Rejected for this scene.
- Kim v2 by YunaOthmer, [source](https://sketchfab.com/3d-models/kim-kitsuragi-disco-elysium-version-2-68e3f02935404e13a3600b28b5fa9051): downloaded; converted GLB assigns one jacket material across the body, with broken UV appearance. Disabling transparency does not repair it. Original FBX may be worth inspecting; do not ship this GLB.
- Joker by asifsaj, [source](https://sketchfab.com/3d-models/joker-persona-5-feb5abf77da84dac9d1a9ed2cf3b4c8e): downloaded; requires axis correction and has an unposed stance. Converted GLB has only a root joint, so the original FBX or another posed model is needed.
- Azir by SirDJCat, [source](https://sketchfab.com/3d-models/azir-league-of-legends-character-1bcad9785c344aab93e776f9e9e6396d): 5.7k triangles, animated, listing explicitly restricts commercial use. Not downloaded or accepted.
- Chamber by JordanStasak, [candidate](https://sketchfab.com/3d-models/chamber-valorant-3d-model-56653a38debc43b0a80f20c4385cdd1a): file, pose, and terms uninspected.
- Remaining leads from the pasted side chat are not verified browser assets. Do not equate a listing with an accepted, textured, posed visitor.

Next: inspect original FBX files for Kim/Joker and continue sourcing the pending characters. Keep the reviewed trio working; do not add unposed or broken placeholders to make the roster look complete.
