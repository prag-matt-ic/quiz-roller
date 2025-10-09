---
mode: 'agent'
tools: ['githubRepo', 'codebase']
description: 'Review and refactor code for clean code principles'
---

## Task

Use the following Clean Code Checklist to review and refactor the current file's code.

## Checklist

- [ ] Use meaningful names – variable and function names should clearly communicate what the code does. Avoid abbreviations or cryptic identifiers; clear naming makes the code self‑documenting. Boolean variables should be named to imply true/false (e.g. isVisible, hasItems).

- [ ] Be consistent – use the same vocabulary for the same type of entity (e.g. always call the current player position playerPos instead of mixing currentPos, position, and pos).

- [ ] Write small, pure functions – each function should have a single responsibility. Break complex logic into smaller helpers rather than nesting conditionals.

- [ ] If a function has 3 or more parameters, use an object to group them - this makes it easier to understand what each parameter means.

- [ ] Prefer early returns over deep nesting – return early to avoid if/else pyramids.

- [ ] Prefer immutability – never mutate objects or arrays directly. When updating state, return new objects instead of modifying existing ones.

- [ ] Avoid magic numbers and strings – declare constants (e.g. LANE_COUNT = 3) so that values are descriptive and changeable.

- [ ] Comment judiciously – write code that is self‑explanatory. When comments are needed, make them precise and consider using // TODO to mark work that should be improved later.

- [ ] Avoid creating expensive objects/classes in loops or animation frames - reuse objects where sensible to reduce garbage collection. For example: never create a new Vector3() inside useFrame().

- [ ] Review imports and ensure that types/interfaces are imported as types (e.g import { type MyType } from '...' ). Delete any unused imports.
