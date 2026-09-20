# Mobile room delivery

Touch devices use smaller embedded model textures and 512 px wood maps. Desktop keeps the original assets. Both geometry levels, material settings, proportions, and interactions are preserved; the cat keeps 1024 px textures for close views. Visitors and music still load only when requested.

`npm run build:touch` regenerates the touch assets from the finished desktop GLBs and wood maps. Run it after changing those source assets. `scripts/touch-assets.test.mjs` checks matching vertex/index counts, bounds, detail levels, texture limits, and at least 40% less model/wood download data.

The HTML preloads only the asset set matching the primary pointer. Runtime loading uses the same media query and URLs so requests are reused. Models and fonts load concurrently, ahead of room construction.

Untouched seat dots have zero idle opacity on all devices. Previously explored seats retain the existing faint dot. Touch drags do not set hover states; mouse hover and keyboard focus still reveal the controls. Item dots remain visible and stools remain tappable.

Verified with a 390 × 844 touch browser: exactly six matching model downloads, no duplicate desktop set, hidden untouched seats, seat/return/cat interaction, and no browser errors. Desktop retains the original model files and seat hover behavior. The full suite has 175 passing tests.
