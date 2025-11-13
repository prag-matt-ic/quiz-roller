## Overview

Quizroller is a proof of concept game developed to showcase the potential of 3D web for educational experiences.

The core mechanic is pretty simple, you navigate your marble over terrain, answering multiple choice questions as you go.

**[👉 How far can you roll? 👈](https://quizroller.vercel.app)**

![Game home stage](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/home.webp?raw=true)

## Tech Stack 💻

- **Next.js** _as the web framework_
- **React Three Fiber** _for 3D rendering_
- **Rapier** _for physics simulation and collision events_
- **WebGL** _for custom materials and effects_
- **Zustand** _for state management_
- **GSAP** _for animations_
- **Tailwind** _for UI styling_

## Colour Palette 🌈

![Palette](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/palette.webp?raw=true)

Colours are driven by a [cosine gradient palette](https://iquilezles.org/articles/palettes/).

The entire theme of the app can be changed by changing the 4 gradient input vectors!

There are helpers in GLSL and TypeScript to retrieve colours using an input value of 0-1.

### Background Generation

![Background texture controls](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/background.webp?raw=true)

I've created a **background texure generator** which is called upon when the palette changes.
It renders 1 to 8 frames (depending on performance) as textures for the background.
_This is an expensive operation due to the fractal noise, but it's only run once when the palette changes._

A background shader smoothly blends between these textures to give subtle movement beneath the platform.

## State Management

Most of the game logic is encapsulated within the [`GameProvider`](https://github.com/prag-matt-ic/quiz-roller/blob/main/components/GameProvider.tsx) which is a Zustand store initialised into React Context.

The Game Store handles the current stage, platform speed, questions, player positioning and collision/intersection events.

### Fast Value Subscriptions 💨

I've avoided setting React State as much as possible to keep the experience snappy.

For frequently updated values such as the player position, the value is captured in a ref, and then read inside `useFrame`.

The following pattern is utilised a few times:

```ts
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { useGameStoreAPI } from '@/components/GameProvider'

export function usePlayerPosition(onPlayerPositionChange?: (pos: Vector3) => void) {
  const gameStoreAPI = useGameStoreAPI()

  // Capture current value in a ref to avoid re-renders
  const playerPosition = useRef<Vector3>(gameStoreAPI.getState().playerWorldPosition)

  useEffect(() => {
    // Subscribe to store updates and update ref only when playerPosition changes
    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.playerWorldPosition === prevState.playerWorldPosition) return
      playerPosition.current = state.playerWorldPosition
      onPlayerPositionChange?.(playerPosition.current)
    })
    return unsubscribe
  }, [gameStoreAPI, onPlayerPositionChange])

  // Fire once on mount so consumers can initialize uniforms/refs immediately.
  useEffect(() => {
    onPlayerPositionChange?.(playerPosition.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { playerPosition }
}
```

## Player

The player is a Rapier kinematic sphere with a `BallCollider`.

### Making it roll! 🕹️

Depending on whether the device is mobile or not, different controls are rendered:

- Desktop: WASD/Arrow keys
- Mobile: a virtual touch joystick

Movement is applied each frame, with gravity keeping the marble planted on raised tiles.
The rotation animation is derived from the player velocity and helps the movement feel natural.

### Collisions and Confirmations ⏳

Rapier sensors mark interactive surfaces: info zone, start tile, answer tiles, colour tiles, and out‑of‑bounds.

For answers, entering a sensor triggers a GSAP‑driven confirmation timer. Exiting before the timer completes cancels the choice. When the timer completes, the choice is confirmed.

When the player enters an info zone, HTML content is animated in using React Transition Group + GSAP.

If the player falls off the platform, they intersect with out-of-bounds and it resets their position or transitions to the 'game over' stage.

### Palette Switching 🎨

![Player colour selection](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/player-colour.webp?raw=true)

The user can change the theme by rolling over one of the colour picker tiles, with their selection persisted in the game store.

### Marble Shading 🔮

The marble uses a custom GLSL material that samples the palette using the chosen colour.

It supports textured and flat modes depending on the quality mode.

## Infinite Platform 🏃

![Platform](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/platform.webp?raw=true)

The main `Platform` is a grid of instanced rigid bodies that endlessly wrap forward.

### Row Recycling ♻️

When a row passes behind the camera, it wraps to the back and is assigned new row data. This approach means the camera can stay fixed looking at the player, with the floor moving like a conveyor beneath it.

Optimal performance is achieved by limiting the number of rendered rows, and using instanced meshes for the repeated tiles.

### Obstacle Course ⚠️

Between each Question stage there is a procedurally generated pathway of safe tiles for the user to navigate. This is created using a noise-driven algorithm.

### Surface Elements 🏠

Each stage has it's own set of elements which are positioned atop the tiles. These elements include the question text, answer tiles, info zones and the player colour picker.

Their positioning is defined within the row data. When their corresponding row is raised, the element is positioned.

The translation (Z movement) of surface elements is synced with the movement of the underlying tiles so they appear fixed to the tiles.

### Tile Shader 🧊

The platform tiles use a custom GLSL shader to colour the tiles, fade in/out and highlight those near the player.

## Questions and Answers 🤔

![Question stage](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/question.webp?raw=true)

Questions are chosen to avoids repeats where possible and shuffle the answer positions.

Each question has a difficulty rating of 1-3. Every two correct answers, the difficulty increases.

Question and Answer text is rendered into a Canvas Texture (see `useTextCanvas`). The texure approach is performant whilst allowing fine-grained control over the font and line height.

### Answer Selection ✅

![Answer selection](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/answer.webp?raw=true)

- A HUD indicator briefly shows correct (✅) or incorrect (❌)
- A short particle burst plays, with a correct answer attracting green particles to the player, and an incorrect answer dispersing orange particles.
- The chosen answer is recorded in `confirmedAnswers`

## Floating Background Tiles ✨

![Floating background tiles powered by GPU](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/floating-tiles.webp?raw=true)

Decorative floating tiles add depth and motion around the course. They are rendered as a single instanced mesh and animated entirely on the GPU using `GPUComputationRenderer`.

- Tiles are placed in a grid formation around the platform, they spawn at a low Y value and float upward, respawning at the bottom once they hit a threshold.
- The whole effect is disabled at low quality by setting the instance count to zero.

## Performance: Adaptive Quality 🏎️

The site achieves great performance even on mobile.

![Stats fps display](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/stats.webp?raw=true)

- My Macbook Pro M4 gets a consistent 120fps on high quality mode.
- My iPhone 15 Pro gets a steady 60fps also on high quality mode.

_(I appreciate these are top-of-the-range devices, but lower powered machines can also hit >30fps.)_

Visual quality is managed by a small Zustand store `PerformanceProvider`. It exposes a `sceneQuality` mode (High/Medium/Low) and a derived `sceneConfig` which is used across components to scale the detail and reduce GPU work.

The main scene is wrapped in Drei's `PerformanceMonitor`. It monitors FPS and calls `onIncline`/`onDecline`, which in turn invokes `onPerformanceChange` from the provider to step the quality up or down.

### Debug Mode 🐞

Adding `?debug=true` to the URL inserts the Drei `Stats` component for displaying FPS, and exposes manual quality and DPR controls.

If you manually change quality in debug tools, auto‑adjustments are paused.

## Bonus: AI Prompts 🤖

I used AI to speed up the development of this project _(who isn't these days!?)_.

When it comes to AI-generated code the quality varies - but by giving the LLM specific guidelines to follow (such as documentation and examples) we can dramatically improve the output.

**The right context** is often the difference between the solution working or not - especially when using new versions of packages that won't be in the training data. Fetching documentation is my go-to method when setting up new projects.

### Reusable Clean Code Prompts

As part of my AI toolkit I've started to refine reusable prompts.
These are checklists which a coding assistant can use to review and refactor code for better readability and performance.
You might find these useful:

**[Clean Code Typescript Prompt](https://github.com/prag-matt-ic/quiz-roller/blob/main/.github/prompts/clean-code.prompt.md)**
_Uses a Clean Code Checklist to review and refactor Typescript code_

**[Clean GLSL Shader Prompt](https://github.com/prag-matt-ic/quiz-roller/blob/main/.github/prompts/clean-shader.prompt.md)**
_Refactors vertex and fragment shaders to reduce GPU cost and improve readability_

## Closing Thoughts

### The Biggest Challenge 🏔️

The most challenging aspect of building Quizroller was definitely the platform logic, and in particular the positioning and movement of elements that sit on top of it - because these elements need to line up correctly, appear on time, move in sync and be recycled efficiently.

The setup for this went through a number of iterations, and a lot of back-and-forth with AI assistants.

I landed on a solution in which the row data is pre-computed, and acts as the single source of truth for what's currently visible. This is flexible too, as new surface elements can be added to the `RowData` type:

```ts
export type RowData = {
  heights: number[] // The height of the tiles within this row
  type: SectionType
  isSectionStart: boolean
  isSectionEnd: boolean
  questionTextPosition?: [number, number, number]
  answerTilePositions?: ([number, number, number] | null)[]
  answerNumber?: number[]
  logoPosition?: [number, number, number]
  colourPickerPosition?: [number, number, number]
  infoZonePositions?: ([number, number, number] | null)[]
}
```

Take a look at the [`Platform` Component](https://github.com/prag-matt-ic/quiz-roller/blob/main/components/platform/Platform.tsx) to understand how it all comes together.

## Limitations / Wishlist 👀

- **The question content is all hard-coded.** My original plan was to use AI to generate personalised quizes based on a user-provided URL or revision notes. I have code to do this, but it incurs cost and slows down the initial start.
- **The terrain/obstacles stage is basic.** I'd love to introduce new challenges such as jumps, wall runs and collectibles.

If you're reading this and want to help develop the concept further, please get in touch.

### Collaborations 🤝

Interested in working together on a new immersive learning experience?
Let's chat!

### Links

[Demo](https://quizroller.vercel.app)

[Debug Mode](https://quizroller.vercel.app?debug=true)
