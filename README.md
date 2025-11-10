## Overview

Quizroller is a proof of concept game developed to showcase the potential of 3D web for learning experiences.

It's pretty simple, you

**[👉 Have a play](https://quizroller.vercel.app)**

## Tech Stack

- **Next.js**
- **React Three Fiber** for 3D rendering
- **Rapier** for physics simulation and collision events
- **WebGL** for custom materials and effects
- **Zustand** for state management
- **GSAP** for animations
- **Tailwind** for UI styling

## State Management

Most of the game logic is encapsulated within the `GameProvider`.
It handles the current stage, question, player positioning and collision/intersection events.

## Player and Movement

The player is a Rapier kinematic sphere with a `BallCollider`.

### Making it move!

Depending on whether the device is mobile or not, different controls are rendered:

- Desktop: WASD/Arrow keys
- Mobile: a virtual touch joystick

Movement is applied each frame with gravity keeping the marble planted on raised tiles.
The rotation animation is derived from the movement velocity and helps make the movement feel natural.

### Marble Shading

xxx

### Collisions and Confirmations

Rapier sensors mark interactive surfaces: info zone, start tile, answer tiles, colour tiles, and out‑of‑bounds.

For answers, entering a sensor triggers a GSAP‑driven confirmation timer. Exiting before the timer completes cancels the choice.

When the player enters an info zone, HTML content is animated in.

If the player falls out of bounds, it resets their position or goes to the game over stage.

## Infinite Platform

![Home](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/home.jpg?raw=true)

The main `Platform` is formed from a group of instanced rigid bodies (grid of rows × columns) that endlessly wrap forward.

### Row Recycling

When a row passes the camera, it wraps to the back and is assigned new 'row data'. This approach means the camera can look at the player, whilst the floor moves like a conveyor beneath it. Limiting the number of rendered rows, and using instanced meshes ensure optimal performance.

### Surface Elements

Each stage (Home, Obstacles, Question) has it's own set of elements which are positioned atop the tiles. These elements include the question text, answer tiles and player colour picker.

Their positioning is defined within the row data. When their corresponding row is raised, the element is positioned.

The translation (Z movement) of surface elements is synced with the movement of the underlying tiles.

### Tile Shader

The platform tiles use a custom shader to colour the tiles, fade in/out and highlight near the player.

## Colour Palette

![Palette](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/palette.jpg?raw=true)

All the colours are driven by a [cosine gradient palette](https://iquilezles.org/articles/palettes/). In theory, the entire theme of the app could be changed by adjusting the 4 gradient input vectors.

There are helpers in GLSL and TypeScript to retrieve colours using an input value of 0-1.

## Floating Background Tiles

![FloatingTiles](https://github.com/prag-matt-ic/quiz-roller/blob/main/public/screenshots/floating-tiles.jpg?raw=true)

Decorative floating tiles add depth and motion around the course. They are rendered as a single instanced mesh and animated entirely on the GPU using `GPUComputationRenderer`.

- One `instancedMesh` draws all tiles.
- Tiles are placed in a grid formation around the platform, they spawn at a low Y value and float upward, respawning at the bottom once they hit a threshold.
- The whole effect is disabled at low quality by setting the instance count to zero.

## Closing

[Live Demo](https://magic-floor.vercel.app)
