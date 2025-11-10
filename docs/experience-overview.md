# Quizroller: How the Experience Works

This document explains the overall architecture and experience flow of Quizroller — a client‑side, educational 3D runner built with Next.js, React Three Fiber, and Rapier physics. It’s a high‑level walkthrough to support a blog post or talk.

## 1) App Boot & Composition

- Next.js page (`app/page.tsx`) dynamically imports the interactive client component `Main` to avoid SSR issues with WebGL.
- Providers wrap the app:
  - `SoundProvider` preloads/plays WebAudio sound effects and background music (muted by default; user enables on start).
  - `GameProvider` (Zustand + context) holds global game state, stages, confirmation flow, questions, and run stats.
  - `PerformanceProvider` tracks device capabilities and adapts visual fidelity, physics step rate, and DPR.
- `LoadingOverlay` shows until assets are ready; “Start” (or “Start muted”) gates audio permissions and hard‑resets the player transform.

## 2) Render Stack (Game Scene)

- `Game` mounts a `Canvas` from React Three Fiber and configures:
  - `PerformanceMonitor` to automatically incline/decline quality based on FPS bands.
  - Camera controls via a custom `Camera` component; `CameraControls` animates to per‑stage presets.
  - Rapier `Physics` step (fixed or varying, controlled by performance settings).
- `Level` composes scene pieces:
  - `Background` texture scaled to the viewport without stretching.
  - `FloatingTiles` decorative instanced boxes driven by a GPU computation pass.
  - `OutOfBounds` sensor plane (below play area) that triggers reset/game‑over.
  - `Platform` (instanced terrain + sections) and `Player` (kinematic sphere + sensors).

## 3) State & Stage Flow

- State lives in a custom Zustand store (`components/GameProvider.tsx`). Key fields:
  - `stage`: HOME → INTRO → QUESTION → TERRAIN → GAME_OVER
  - `terrainSpeed` (0..1), `playerInput`, `playerWorldPosition`, `distanceRows`.
  - Confirmation state: `confirmationProgress`, `confirmingStart`, `confirmingAnswer`, `confirmingColourIndex`.
  - Questions: `currentQuestion`, `questions`, `currentDifficulty` (ramps every 2 correct answers).
  - Run stats: `currentRun`, `previousRuns`.
- Transitions:
  - HOME → roll onto “Start” tile to arm a confirmation timer; on confirm, selects first question and goes to INTRO.
  - INTRO → accelerates to full speed (GSAP tween), then proceeds into the course.
  - QUESTION → decelerates to a stop near question tiles; after confirming an answer, proceeds to TERRAIN.
  - TERRAIN → resumes full speed, continues course; new questions interleave with obstacle sections.
  - GAME_OVER → triggered by falling off or OOB; speed eases to 0 and run stats are saved.

## 4) Terrain System (Instancing + Sections)

- `Platform` manages a band of instanced rigid bodies (grid of rows × columns) that endlessly wrap forward.
- Rows recycle: when a row passes the camera, it wraps to the back and is assigned new “row data” (heights + metadata) from a precomputed sequence.
- Sections:
  - HOME: logo, colour picker, a single wide “Start” tile, info zones.
  - INTRO: a short lead‑in to the run.
  - QUESTION: places the question text and two answer tiles; the ground outside tile rectangles is sunken (“unsafe”) so only the tiles are walkable.
  - OBSTACLES: procedurally generated blockers (sunken vs walkable heights) with seeded randomness; buffered to avoid stalls.
- Row animation windows:
  - Rows lift as they enter (raised from below), and lower as they exit, with fixed Z windows for lift/lower so placement aligns as rows pass the player.
- Question pacing:
  - On entering a question section, terrain speed decelerates smoothly to 0 over the section’s window so the player can aim and confirm an answer.

## 5) Player Controller & Feel

- The `Player` is a kinematic sphere with a `BallCollider`; movement is applied via `setNextKinematicTranslation`.
- Input:
  - Desktop: WASD/Arrow keys update `playerInput` (normalized, clamped) and are reflected in an on‑screen key overlay.
  - Mobile: a virtual joystick emits leveled axes (0–10) mapped into normalized input.
- Physics feel:
  - Gravity is applied to keep the marble grounded; a “conveyor” effect subtracts the terrain’s Z displacement per frame.
  - Visual rolling is computed from linear velocity; the mesh rotates on an axis perpendicular to motion.
- Collisions are sensor‑based: entering/exiting answer/start/colour/out‑of‑bounds colliders updates confirmation or triggers game over/reset.
- Edge warnings: based on player world position, the UI overlays subtle gradient bands when approaching platform edges or the row lift boundary.

## 6) Questions, Difficulty, and Confirmation UX

- `resources/content.ts` selects the next question by difficulty and history, shuffles answers, and avoids repeats if possible.
- Difficulty ramps: every 2 correct answers increases `currentDifficulty` up to a max.
- Confirmation flow:
  - Rolling onto a tile arms a GSAP‑driven confirmation timer (`confirmationProgress` 0→1).
  - Leaving the tile cancels/rewinds progress smoothly.
  - On completion, the action fires: start → begin run; answer → record correct/incorrect, play FX and spawn particles, then resume terrain.
- `AnswerTile` draws the tile frame and label via a small shader that samples a text canvas; particles burst on confirm.

## 7) Camera & Presentation

- `Camera` interpolates between per‑stage presets (position/zoom/target) while always looking at either the player or an override.
- Stage presets:
  - HOME: wider, slightly elevated view.
  - INTRO/TERRAIN: lower, faster angle over the course.
  - QUESTION: higher angle for situational awareness.
  - GAME_OVER: pulls back to frame the summary.

## 8) UI Layer

- `UI` switches between overlays based on game state:
  - `PlayingUI`: live counters for correct answers and distance, highlighting new PBs.
  - `Controls`: keyboard overlay (desktop) or joystick (mobile).
  - `GameOverUI`: animated results card with “Roll Again” and optional Web Share.
  - `EdgeWarningOverlay`: gradient bands for boundary proximity.
- `LoadingOverlay`: handles asset readiness, user audio opt‑in, and resets the player before the run starts.

## 9) Audio

- `SoundProvider` uses WebAudio with preloaded buffers and controlled gain nodes.
- Event‑driven sound effects: background loop, correct/incorrect, colour change, out‑of‑bounds, reveal.
- “Start muted” toggles global mute; unmuting fades in background music and allows FX playback.

## 10) Performance Strategy

- Adaptive quality: `PerformanceMonitor` nudges scene quality up/down (LOW/MEDIUM/HIGH) based on FPS bands.
- Tunables:
  - Device DPR cap (`maxDPR`), Rapier sim rate (vary/30/60/120), instanced counts, geometry resolution, and optional detail noise.
  - `useGameFrame` provides fixed‑step simulation (with substep cap) or real‑time if uncapped.
- Rendering and physics pipelines avoid per‑frame allocations; temporary vectors/quaternions/arrays live in refs and mutate in place.
- Instancing for terrain and floating tiles minimizes draw calls.
- GPGPU (`GPUComputationRenderer`) drives floating tile motion and alpha in a compute texture sampled by an instanced material.

## 11) Content & Extensibility

- Questions live in `resources/questions.ts` with difficulty tags and optional citations/links.
- Terrain sections are generated from helpers (`utils/platform/*`), making it straightforward to add new section types.
- The confirmation mechanic is generic (GSAP‑driven timer + sensor bodies), so adding new “confirm to act” surfaces is easy.
- Debug tools: `?debug=true` enables stats and makes tuning easier.

## 12) Experience Summary (Player Journey)

1. Load screen shows progress; user clicks Start (muted or not).
2. Home section scrolls in: pick a marble colour, read intro/info, roll onto the Start tile to begin.
3. Intro accelerates to running speed; obstacles and ambience set the tone.
4. On a question section, terrain decelerates; roll onto the chosen answer to confirm.
5. Correct answers increase difficulty over time; the run continues.
6. Fall off or hit out‑of‑bounds → Game Over; view stats, share, and roll again.

---

If you’re extending the project, start with `Main` for composition, `GameProvider` for state and transitions, `Platform` for sections, and `Player` for feel and input. The core patterns (instancing, refs, fixed‑step hooks, and GSAP confirmations) are the building blocks for new features.

