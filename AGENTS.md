# AGENTS

This repository is used with an agentic coding workflow. The rules in this file apply to the entire repo.

## Project overview

This is an educational 3D runner game built with Next.js, React Three Fiber, and Rapier physics.

## Performance rules

- Avoid per‑frame allocations in render/update loops. In particular, do not construct new `THREE.Vector3`, `THREE.Quaternion`, arrays, or temp objects inside `useFrame` or physics tick handlers. Pre‑allocate and reuse objects via `useRef` and mutate them in place.
- Prefer in‑place math operations (`set`, `copy`, `add`, `multiplyScalar`, etc.) over methods that allocate (e.g. `clone`).
- When reading world transforms each frame, reuse target objects: pass a preallocated vector/quaternion/matrix into methods like `getWorldScale`, `getWorldPosition`, and `getWorldQuaternion`.

Example pattern:

```ts
const tmpV = useRef(new Vector3())

useFrame((_, dt) => {
  tmpV.current.set(ax, ay, az)
  tmpV.current.multiplyScalar(dt)
  // ... use tmpV.current without creating new Vector3s
})
```

## Clean Code guidelines

Use meaningful names – variable and function names should clearly communicate what the code does. Avoid abbreviations or cryptic identifiers; clear naming makes the code self‑documenting.

Be consistent – use the same vocabulary for the same type of entity (e.g. always call the current player position playerPos instead of mixing currentPos, position, and pos).

Write small, pure functions – each function should have a single responsibility. Break complex logic into smaller helpers rather than nesting conditionals.

Prefer early returns over deep nesting – return early to avoid if/else pyramids.

Prefer immutability – never mutate objects or arrays directly. When updating state, return new objects instead of modifying existing ones.

Avoid magic numbers and strings – declare constants (e.g. LANE_COUNT = 3) so that values are descriptive and changeable.

Comment judiciously – write code that is self‑explanatory; when comments are needed, make them precise and consider using // TODO to mark work that should be improved later.

## Tailwind Styling

Use `size-[x]` for square/circle shapes instead of separate `h-[x]` and `w-[x]`.

**When concatenating class strings**, use `twJoin` or `twMerge` from 'tailwind-merge'. Prefer `twJoin` when all classes are defined within a component (no conflicts). Use `twMerge` when merging external props with internal classes that might conflict.

Examples:

```tsx
// Square/circle shapes
<div className="size-12 rounded-full" />

// Class concatenation
<div className={twJoin('size-12', isActive && 'ring-2')} />
<div className={twMerge('size-12 bg-blue-500', externalClassName)} />
```

## Zustand best practices

Zustand is used for global state in this project. To keep components fast and predictable:

Split stores by concern.

Use selectors – when consuming state in a component, call the hook with a selector (useStore((state) => state.someValue)) so that the component re‑renders only when that slice changes.

Never retrieve the entire store in a component.

Subscribe to frequently changing values – for values that update every frame (e.g. game time or physics ticks), subscribe to the value and set it in a ref, like `useTimeSubscription`.

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

The project deliberately avoids a traditional game engine. It is built on web standards (Three.js, React).

Use functional components and hooks; avoid class components.

There is no server state. All game logic runs client‑side.

When writing new TypeScript, favour type aliases to describe shapes and prefer generics where appropriate.

By following these guidelines and patterns, you can generate code that fits naturally into the repository and remains easy for developers to understand and maintain.
