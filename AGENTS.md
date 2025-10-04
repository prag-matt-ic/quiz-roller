# AGENTS

This repository is used with an agentic coding workflow. The rules in this file apply to the entire repo.

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

## State management

- Split Zustand stores by concern. Use selectors in components and keep state immutable via functional updates.
- Avoid storing derived state in stores; compute in components or hooks.

## Clean code

- Use clear, descriptive names and consistent vocabulary.
- Prefer small, pure functions with early returns.
- Avoid magic numbers: extract constants.

