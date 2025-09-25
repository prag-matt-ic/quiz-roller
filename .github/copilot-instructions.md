# Copilot instructions for quiz-roller

This is a Next.js 15 (App Router) app that combines a 3D mini‑game (React Three Fiber + Rapier) with an AI‑generated quiz (Vercel AI SDK). Follow the patterns below to stay consistent and productive.

## Architecture

- Flow: `app/page.tsx` → `app/Main.tsx` → `app/Game.tsx`.
- 3D game (`Game.tsx`):
  - R3F `Canvas` + Rapier `Physics`. Player is kinematic; movement in `useFrame` via `body.setNextKinematicTranslation`.
  - Collisions use intersection events and `rigidBodyObject.userData` discriminators (e.g. `{ type: 'answer', text }`).
  - Answers are sensor colliders (`<CuboidCollider sensor />`) with a plate mesh and `<Text>` from Drei. Player proximity triggers a HUD confirmation.
  - HUD uses `<Html>` overlay + `react-transition-group` and GSAP timelines (store timelines in refs; don’t keep animation state in React).
- AI backend: `app/api/chat/route.ts` streams responses with `streamText`, `toolChoice: 'required'`, and tools from `model/tools.ts`.
- Tooling: `model/tools.ts` defines `generateQuestionTool` (zod schemas in `model/schema.ts`) and calls `generateObject({ model: openai('gpt-5-mini') })`.

## Conventions

- Type first: zod for schemas; infer types (`z.infer`, `InferUITool`, `InferToolOutput`).
- Physics: zero‑gravity/kinematic bodies; sensors for triggers; always set meaningful `userData`; use `onIntersectionEnter/Exit` and early returns.
- State: frame‑level mutable data in `useRef`; React state only for UI flags (e.g., `isConfirmingAnswer`).
- Animations: drive with GSAP timelines in refs; use Drei Html overlays for HUD; Tailwind for styling.
- Keep functions small and pure; avoid mutation; prefer early returns and constants over magic values.

## Workflows

- Dev: `npm run dev` (Turbopack). Build: `npm run build`. Start: `npm run start`. Lint: `npm run lint`.
- Requires `OPENAI_API_KEY` for `@ai-sdk/openai` (set in env before dev/build).
- 3D debug is enabled (`<Physics debug />`) and `<OrbitControls />` is present.

## Quiz data flow

- `Game.tsx` calls `onAnswerConfirmed(text)` after a GSAP‑timed confirmation HUD.
- `Main.tsx` receives it, increments difficulty (max 10), then `useChat().sendMessage({ text }, { body: { currentDifficulty } })`.
- API route reads `messages` and `currentDifficulty`, enforces tool usage; UI renders `tool-generateQuestion` parts: read `output.text` and `output.answers` to show options.

## Extending the game/AI

- New game objects: use sensor/kinematic patterns and set `userData` discriminators; copy `Answer` pattern and handle in player intersection.
- Wire AI answers into 3D: pass streamed answers from `Main.tsx` into `Game.tsx` (replace placeholder `answers` array) and call the provided `onAnswerConfirmed` when the HUD completes.
- New tools: add to `model/tools.ts` and export via `tools`; in `Main.tsx`, handle new `part.type` branches when rendering messages.

## Key files

- `app/Game.tsx` (Player, Answers, Terrain, HUD; GSAP + Rapier patterns)
- `app/Main.tsx` (AI chat wiring; renders tool UI parts)
- `app/api/chat/route.ts` (model, system prompt, tool routing)
- `model/tools.ts`, `model/schema.ts` (zod schemas, tool execution)
- `AGENTS.md` (additional guidelines; use implemented patterns in code as the source of truth)

If any section is unclear (e.g., replacing placeholder answers with streamed ones), tell me what you’re building and I’ll refine both this guide and the wiring steps.
