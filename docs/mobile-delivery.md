# Mobile room delivery

Touch devices use smaller embedded model textures and 512 px wood maps. Desktop keeps the original assets. Both geometry levels, material settings, proportions, and interactions are preserved; the cat keeps 1024 px textures for close views. Visitors and music still load only when requested.

`npm run build:touch` regenerates the touch assets from the finished desktop GLBs, wood maps, and scene frame images. Run it after changing those source assets. `scripts/touch-assets.test.mjs` checks matching vertex/index counts, bounds, detail levels, texture limits, and at least 40% less model/wood download data.

The HTML preloads only the asset set matching the primary pointer. Runtime loading uses the same media query and URLs so requests are reused. Models and fonts load concurrently, ahead of room construction.

Untouched seat dots have zero idle opacity on all devices. Previously explored seats retain the existing faint dot. Touch drags do not set hover states; mouse hover and keyboard focus still reveal the controls. Item dots remain visible and stools remain tappable.

Verified with a 390 × 844 touch browser: exactly six matching model downloads, no duplicate desktop set, hidden untouched seats, seat/return/cat interaction, and no browser errors. Desktop retains the original model files and seat hover behavior. The full suite has 186 passing tests.

## Loading and interaction review

The initial interface bundle is now 18.71 KB (6.72 KB gzip), down from about 639 KB (170 KB gzip), by keeping Three.js out of the seat-name helper used by the UI. The dynamically imported scene still contains the engine; this moves work off the critical interface path rather than claiming it disappeared.

The full-screen pendant loading scene reports completion across six models and five textures, then room construction, lighting preparation, and the first rendered frame. Header navigation and a direct work link remain usable during loading. Failure presents retry and work links; reduced-motion and no-JavaScript fallbacks are supported. Art and portrait textures now use 768 px desktop / 512 px touch copies instead of fetching large portfolio images after the room appears.

Static meshes retain indexed geometry during batching and avoid repeated local transform composition. Picking visits only visible mesh levels. Visitor textures upload across frames and their color/shadow shaders prepare before the door reveal. Adaptive resolution responds to sustained slow movement, ignores isolated stalls and idle frames, and recovers after sustained smooth motion. Purr synthesis runs in a cancellable worker without changing its sound or mix.

Browser checks use Chrome with Metal on macOS, a 390 × 844 touch viewport, and CPU throttling where noted; these are simulated mobile checks, not measurements from a physical phone. Verified loading, failure, reduced motion, no JavaScript, seat/return, cat audio cancellation, record playback, and visitor appearance. Every matching model and scene texture downloads once; the desktop asset set and full-size portfolio frame images are absent from touch startup.
