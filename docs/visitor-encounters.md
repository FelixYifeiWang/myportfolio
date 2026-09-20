# Doorway visitors

Local feature branch: `feature/door-visitors`. This feature is not deployed.

## Experience

Click the existing door. Prepare a single downloaded character behind the closed door, open inward over 1.3 seconds, hold for 6 seconds, then close before removing the visitor. No immediate repeat when more than one character is available. No walking animation is required. Preserve the current rain/music balance until the visual sequence has been reviewed.

Load models only on interaction, with at most two prepared assets retained. Target roughly 1–2 MB per compressed visitor and 50k triangles or fewer, allowing individual exceptions after measuring. Small characters need a different camera framing from human characters. Original poses, materials, texture orientation, and doorway clearance must be inspected before acceptance.

## Implemented foundation

- `DoorEncounter`: cancellable load/open/hold/close lifecycle, duplicate-click protection, no immediate repeats, reduced motion, and disposal. Covered by six behavior tests.
- `createEntrance`: existing entrance appearance separated into a hinged leaf and fixed threshold, mat, and lamp. Hinge movement and batching exclusions tested.
- `createEntranceWall`: structural wall geometry with a real doorway; raycast tests confirm clearance at small and human character heights.

The wall opening and encounter controller are not yet wired into the live scene. Keep the door non-interactive until an accepted character is ready; do not reveal an empty opening. When integrating, exclude the hinge/visitor subtree from room batching and invalidate static shadows while the door moves. Return camera focus to the prior room/seat view through the existing view-history behavior.

## Sources checked on 2026-09-20

| Character | Source | Status |
|---|---|---|
| Pikachu | https://sketchfab.com/3d-models/pikachu-c22dab8fc3064c76a0c502d64555a74f | Download enabled, 4.5k triangles, rigged; listing says CC BY. Official download opens a sign-in dialog. File not obtained. |
| Kim Kitsuragi | https://sketchfab.com/3d-models/lt-kim-kitsuragi-disco-elysium-a52477c40ebf48f594c28c9faf99b2c5 | Listing advertises download, 33.6k triangles, rigged, CC BY. File not obtained. |
| Joker | https://sketchfab.com/3d-models/joker-persona-5-feb5abf77da84dac9d1a9ed2cf3b4c8e | Listing advertises download, 20k triangles, CC BY. File not inspected. |
| Chamber | https://sketchfab.com/3d-models/chamber-valorant-3d-model-56653a38debc43b0a80f20c4385cdd1a | Downloadable candidate; file, pose, and terms still need inspection. |

A listing's license is not evidence that all underlying character rights belong to its uploader. Retain source attribution and inspect the original download terms before a public release. No models have been downloaded or published in this feature branch.

The agreed target roster is Link, Pikachu, Ranni, Wolf/Sekiro, Arthas, Jackie Welles, Azir, Chamber, Byleth (provisional replacement for Felix), Eye of Cthulhu (Terraria), Shadowheart, Joker, Lune, and Kim Kitsuragi. The remaining models from the pasted discussion are leads, not verified downloadable assets. Some newly checked sources offer paid memberships or heavyweight Daz/VAM packages; do not represent them as ready-to-use browser assets or buy access without an agreed price.

## Next step

Obtain the original Pikachu and Kim files through the signed-in Sketchfab download UI. The user has been asked to sign in. Inspect them before choosing conversion, posing, and compression settings. Build the first complete encounter with a real accepted model, then review three contrasting body shapes before expanding the roster.
