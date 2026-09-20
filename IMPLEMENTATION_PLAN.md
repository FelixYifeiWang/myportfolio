## Stage 1: Audible, stable cat interaction
**Goal**: Make the purr audible over music and remove the breathing jump when selecting the cat.
**Success Criteria**: Continuous breathing phase, repeated selection does not restart focus, purr has speaker-audible body without harsh highs.
**Tests**: Audio mix tests, repeat-selection check, TypeScript and build.
**Status**: Complete

## Stage 2: Requested record order
**Goal**: Preserve one original track, then play the seven requested recordings in order, then sound off, then restart the cycle.
**Success Criteria**: Exact order and off step, pause/resume behavior preserved, actual recording sources verified.
**Tests**: Playlist order and off-step tests, browser playback checks.
**Status**: Not Started
**Waiting on**: User is considering local audio files versus visible official embeds. Keep current playback unchanged until they choose.
**Requested order**: Last light → Take Five (The Dave Brubeck Quartet) → 我只在乎你 (邓丽君) → Bohemian Rhapsody (Queen) → みずいろの雨 (八神純子) → luther (Kendrick Lamar with SZA) → DRAMA (G-DRAGON) → Comfortably Numb (Pink Floyd) → sound off → repeat.

## Stage 3: Final verification
**Goal**: Verify audio lifecycles, camera behavior and loading cost.
**Success Criteria**: No duplicate playback, no cat animation jump, no browser errors.
**Tests**: Full existing suite and live browser checks.
**Status**: Complete
**Result**: Cat changes checked in the browser; TypeScript/build and all 70 tests pass. Playlist deferred per user.
