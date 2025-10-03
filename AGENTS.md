# PRO CODER

## Project overview

This is an educational 3D runner game built with Next.js, React Three Fiber, and Rapier physics.

## Clean Code guidelines

Use meaningful names – variable and function names should clearly communicate what the code does. Avoid abbreviations or cryptic identifiers; clear naming makes the code self‑documenting
github.com

Be consistent – use the same vocabulary for the same type of entity (e.g. always call the current player position playerPos instead of mixing currentPos, position, and pos).

Write small, pure functions – each function should have a single responsibility. Break complex logic into smaller helpers rather than nesting conditionals.

Early returns over deep nesting – return early to avoid if/else pyramids.

Prefer immutability – never mutate objects or arrays directly. When updating state, return new objects instead of modifying existing ones.

Avoid magic numbers and strings – declare constants (e.g. LANE_COUNT = 3) so that values are descriptive and changeable.

Comment judiciously – write code that is self‑explanatory; when comments are needed, make them precise and consider using // TODO to mark work that should be improved later.

## Zustand best practices

Zustand is used for global state in this project. To keep components fast and predictable:

Split stores by concern – for example, GameProvider holds game state, while useInputStore handles user input.

Use selectors – when consuming state in a component, call the hook with a selector (useStore((state) => state.someValue)) so that the component re‑renders only when that slice changes. Avoid retrieving the entire store in a component.

Subscribe to frequently changing values – for values that update every frame (e.g. game time or physics ticks), subscribe to the value and set it in a ref, like useTimeSubscription.

Keep state immutable – always use functional updates (set((prev) => {…})) and avoid mutating nested objects.

Avoid derived state in the store – compute derived values (like isRunning) in components or hooks rather than storing them.

## Architecture & Core Systems

### State Management

The game uses Zustand wrapped in a React context (stores/GameProvider.tsx) to hold global game state. Keyboard input is handled separately in stores/useInputStore.ts. Time is managed by the useTimeSubscription hook, which synchronises GSAP animations with the game state. GSAP handles time scaling and visual effects; avoid storing animation state in React.

### Physics & collision

Physics are powered by Rapier.

### Performance patterns

Instanced rendering – obstacles are drawn with instanced meshes (InstancedRigidBodies) to render hundreds of objects efficiently.

Refs for mutable state – time‑sensitive or mutable values that should not trigger React re‑renders (like world positions) are stored in useRef. Components read and update these refs in requestAnimationFrame loops or subscriptions.

Object pooling – physics bodies are reused rather than created and destroyed each time. When adding new obstacles or gates, reuse existing instances if possible.

### Input handling

Player movement is discrete: arrow keys or WASD trigger movement.

## Additional notes

The project deliberately avoids a traditional game engine. It is built on web standards (Three.js, React). Use functional components and hooks; avoid class components.

There is no server state. All game logic runs client‑side.

Immutable updates – all Zustand stores should use immutable patterns (e.g. spread operators) to update nested objects.

When writing new TypeScript, favour type aliases to describe shapes and prefer generics where appropriate.

By following these guidelines and patterns, you can generate code that fits naturally into the repository and remains easy for developers to understand and maintain.
