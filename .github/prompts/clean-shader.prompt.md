---
description: 'Review and refactor shader code for best practices'
tools: ['edit', 'search', 'runCommands', 'changes', 'fetch', 'todos']
---

## Task

Use the following Checklist to review and refactor the current shader's vertex and fragment code.

Begin first by identifying any violations of the checklist items. Then, refactor the code to address these issues.

## Checklist

### General

- [ ] Identify the bottleneck before refactoring: if vertex-bound, reduce vertex instruction count; if fragment-bound, prioritize cutting fragment work (precision, move work to vertex).

- [ ] Lights: calculate only the number of lights you actually use; limit light count and avoid iterating over unused lights (use a uniform active-light count). Consider per-vertex lighting when acceptable.

### Performance and optimization

- [ ] Use precision qualifiers: declare variables with the appropriate precision qualifier (lowp, mediump, highp) to optimize memory usage and performance. lowp uses the least resources but may sacrifice accuracy. See Vertex/Fragment precision items for specifics.

- [ ] Minimize branching: use conditionals judiciously, especially in fragment shaders. Where possible, replace branches with branchless math (for example, mix/step/smoothstep or multiplications) so cores follow the same instruction path.

- [ ] Avoid redundant calculations: hoist common subexpressions, reuse intermediates, and compute shared values once (per draw or per vertex) instead of per fragment.

- [ ] Simplify logic: prefer simpler lighting/shading models when quality allows and remove unnecessary computations and features.

- [ ] Organize with functions: break complex shaders into small, reusable helper functions to improve readability and maintainability (GLSL compilers typically inline small functions).

### Vertex Shader

#### Move work out of the fragment stage when quality allows.

- [ ] Move calculations from fragment to vertex when results can be interpolated without noticeable artifacts (for example, trigonometric terms like sin/cos on a time value, simple lighting factors).

#### Use only the precision you need, and match varyings with the fragment stage.

- [ ] Choose appropriate precision for computations and varyings:
  - highp only when strictly required (for example, matrix multiplications and precise 3D transforms)
  - mediump for most general math
  - lowp for color-like data
- [ ] Ensure varying precision matches the fragment input to avoid unintended upcasts (for example, vColor as lowp when consumed as lowp in fragment).

#### Keep the interface lean.

- [ ] Output only the varyings actually used by the fragment shader to minimize interpolation overhead.

#### If vertex becomes the bottleneck, simplify math.

- [ ] Reduce instruction count when vertex-bound: remove redundant calculations, share intermediate results, and avoid expensive functions when not needed.

### Fragment Shader

#### Decrease precision where possible to reduce cycles.

- [ ] Use the lowest precision that preserves quality:
  - lowp for colors and intensities in [0..1]
  - mediump for most math and texture coordinates (texture coords typically need at least mediump)
  - highp only if required for accurate 3D math
- [ ] Declare precision explicitly at the top of the fragment shader (for example, `precision lowp float;`) and set uniform precisions appropriately (for example, `uniform lowp float BlendIntensity;`).

// Prefer interpolated inputs over recomputation per fragment.

- [ ] Prefer using varyings computed in the vertex shader (for example, a color derived from sin(time)) instead of recomputing expensive functions in the fragment shader.

// Practical checks derived from the article examples.

- [ ] Audit any trigonometric, power, or division operations in the fragment shader; if visually acceptable, precompute per-vertex and pass via varyings.
- [ ] For fragment-bound scenes, validate whether lowering precision (for example, mediump → lowp for colors) yields a measurable gain; some GPUs halve cycle cost when dropping precision.
- [ ] For full-screen or high fill-rate passes, keep fragment code minimal and avoid unnecessary work (texture fetches, non-linear functions) to reduce pixel processing cost.
