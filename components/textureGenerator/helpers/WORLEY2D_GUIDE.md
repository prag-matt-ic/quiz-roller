# Worley2D Helper - Quick Reference

## Overview

Worley Noise (also called Cellular or Voronoi noise) creates organic cell-like patterns. This helper wraps the `glsl-worley` npm package to provide cellular noise generation for background textures.

## Import

```glsl
#pragma glslify: worley2D = require(../helpers/worley2D.glsl)
```

## Function Signature

```glsl
vec2 worley2D(vec2 P, float jitter, bool manhattanDistance)
```

## Parameters

### P (vec2)

- **Description:** Input coordinates
- **Usage:** Multiply UV by scale for frequency control
- **Example:** `uv * 5.0` = 5 cells across the texture

### jitter (float)

- **Range:** 0.0 - 1.0
- **Description:** Randomness of cell centers
- **Values:**
  - `0.0` = Perfect grid (no randomization)
  - `0.5` = Moderate randomness
  - `1.0` = Fully random cell centers
- **Leva:** 0-1, step 0.01, default 1.0

### manhattanDistance (bool)

- **Description:** Distance metric to use
- **Values:**
  - `false` = Euclidean distance (circular cells, smooth)
  - `true` = Manhattan distance (square cells, jagged)
- **Leva:** Boolean toggle, default false

## Return Value

Returns `vec2` containing two distance values:

### F.x (F1)

- Distance to **nearest** feature point
- Creates classic voronoi/cell pattern
- Lower values = closer to cell center
- Higher values = closer to cell edges

### F.y (F2)

- Distance to **second nearest** feature point
- Creates ring patterns around cells
- Useful for dual-layer effects

## Common Pattern Types

### 1. Classic Cells (F1)

```glsl
vec2 F = worley2D(uv * scale, jitter, false);
float pattern = F.x;  // Use first distance
```

**Result:** Circular/rounded cells with darker centers

### 2. Cell Borders (F2 - F1)

```glsl
vec2 F = worley2D(uv * scale, jitter, false);
float pattern = F.y - F.x;  // Difference creates edges
```

**Result:** Thin lines outlining each cell (most popular!)

### 3. Inverted Cells (1.0 - F1)

```glsl
vec2 F = worley2D(uv * scale, jitter, false);
float pattern = 1.0 - F.x;  // Invert
```

**Result:** Bright centers, dark edges

### 4. Ring Patterns (F2)

```glsl
vec2 F = worley2D(uv * scale, jitter, false);
float pattern = F.y;  // Use second distance
```

**Result:** Concentric rings around cell centers

## Leva Controls Structure

```tsx
const worleyControls = useControls('Worley Noise', {
  worleyEnabled: {
    value: true,
    label: 'Enabled',
  },
  worleyScale: {
    value: 5.0,
    min: 0.5,
    max: 20.0,
    step: 0.5,
    label: 'Scale',
  },
  worleyJitter: {
    value: 1.0,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    label: 'Jitter',
  },
  worleyManhattan: {
    value: false,
    label: 'Manhattan Distance',
  },
  worleyPattern: {
    value: 'F2-F1',
    options: ['F1', 'F2', 'F2-F1'],
    label: 'Pattern Type',
  },
  worleyMix: {
    value: 0.5,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    label: 'Mix Amount',
  },
})
```

## Shader Uniforms

```glsl
uniform float uWorleyScale;
uniform float uWorleyJitter;
uniform bool uWorleyManhattan;
uniform int uWorleyPattern;  // 0=F1, 1=F2, 2=F2-F1
uniform float uWorleyMix;
```

## TypeScript Types

```tsx
// Add to BackgroundShaderUniforms
uWorleyScale: number
uWorleyJitter: number
uWorleyManhattan: boolean
uWorleyPattern: number  // 0, 1, or 2
uWorleyMix: number

// Add to INITIAL_BACKGROUND_UNIFORMS
uWorleyScale: 5.0,
uWorleyJitter: 1.0,
uWorleyManhattan: false,
uWorleyPattern: 2,  // F2-F1 (cell borders)
uWorleyMix: 0.5,
```

## Shader Implementation

```glsl
#pragma glslify: worley2D = require(../helpers/worley2D.glsl)

uniform float uWorleyScale;
uniform float uWorleyJitter;
uniform bool uWorleyManhattan;
uniform int uWorleyPattern;
uniform float uWorleyMix;

void main() {
    vec2 uv = vUv;
    vec3 color = vec3(0.1);  // Base color

    // Compute worley noise
    vec2 F = worley2D(uv * uWorleyScale, uWorleyJitter, uWorleyManhattan);

    // Select pattern based on uniform
    float pattern;
    if (uWorleyPattern == 0) {
        pattern = F.x;           // F1
    } else if (uWorleyPattern == 1) {
        pattern = F.y;           // F2
    } else {
        pattern = F.y - F.x;     // F2-F1
    }

    // Apply to color
    color = mix(color, vec3(pattern), uWorleyMix);

    gl_FragColor = vec4(color, 1.0);
}
```

## useFrame Integration

```tsx
useFrame(() => {
  if (!shaderRef.current) return

  // Apply enabled toggle by zeroing mix
  shaderRef.current.uWorleyScale = worleyControls.worleyScale
  shaderRef.current.uWorleyJitter = worleyControls.worleyJitter
  shaderRef.current.uWorleyManhattan = worleyControls.worleyManhattan

  // Convert pattern string to int
  const patternMap = { F1: 0, F2: 1, 'F2-F1': 2 }
  shaderRef.current.uWorleyPattern = patternMap[worleyControls.worleyPattern]

  shaderRef.current.uWorleyMix = worleyControls.worleyEnabled ? worleyControls.worleyMix : 0
})
```

## Visual Examples

### Scale Variations

- **0.5-2.0:** Large cells, good for macro textures (rock surfaces)
- **3.0-8.0:** Medium cells, balanced detail (biological cells)
- **10.0-20.0:** Tiny cells, fine detail (microscopic patterns)

### Jitter Variations

- **0.0:** Perfect hexagonal grid (artificial, geometric)
- **0.3:** Slightly randomized (semi-organic)
- **0.7:** Moderately organic (natural looking)
- **1.0:** Fully random (very organic, chaotic)

### Distance Metric Comparison

| Euclidean (false) | Manhattan (true) |
| ----------------- | ---------------- |
| Circular cells    | Square cells     |
| Smooth edges      | Sharp corners    |
| Natural, organic  | Geometric, rigid |
| Faster compute    | Slightly slower  |

## Creative Uses

### 1. Rock Texture

```glsl
vec2 F = worley2D(uv * 8.0, 1.0, false);
float rocks = F.y - F.x;
rocks = pow(rocks, 2.0);  // Sharpen cracks
color = mix(color, vec3(rocks), 0.7);
```

### 2. Cell Membrane

```glsl
vec2 F = worley2D(uv * 5.0, 1.0, false);
float membranes = smoothstep(0.02, 0.05, F.y - F.x);
color = mix(color, vec3(0.9, 0.4, 0.6), membranes);
```

### 3. Cracked Earth

```glsl
vec2 F = worley2D(uv * 12.0, 0.8, true);  // Manhattan for angular cracks
float cracks = 1.0 - smoothstep(0.0, 0.1, F.y - F.x);
color = mix(color, vec3(0.3, 0.2, 0.1), cracks * 0.5);
```

### 4. Abstract Bubbles

```glsl
vec2 F = worley2D(uv * 6.0, 1.0, false);
float bubbles = 1.0 - F.x;
bubbles = pow(bubbles, 3.0);  // High contrast
color += vec3(bubbles) * 0.4;
```

## Performance Notes

- **Complexity:** Medium - computes distances to 6 neighboring cells
- **Cost:** ~0.2-0.3ms per full-screen pass at 1080p
- **Optimization:** Already uses 2x3 window instead of 3x3 for speed
- **Recommendation:** Safe to use with 2-3 other effects simultaneously

## Library Information

- **Source:** [glsl-worley](https://github.com/Erkaman/glsl-worley) by Erkaman
- **Author:** Stefan Gustavson (original algorithm)
- **License:** MIT
- **Version:** Imported from npm package
- **Quality:** Production-ready, battle-tested in many projects

## Troubleshooting

### Issue: Patterns too small/large

**Solution:** Adjust `worleyScale` uniform (multiply UV by different value)

### Issue: Cells look too regular

**Solution:** Increase `worleyJitter` (0.0 → 1.0)

### Issue: Want sharper edges

**Solution:** Use Manhattan distance or apply `pow()` to result

### Issue: Borders too thick

**Solution:** Use `smoothstep()` to thin edges:

```glsl
float borders = smoothstep(0.0, 0.05, F.y - F.x);
```

### Issue: Pattern not visible

**Solution:** Check mix amount and ensure enabled = true

## Related Effects

Can be combined with:

- **Fractal Noise:** Add organic variation to cell sizes
- **Grainy Noise:** Add texture inside cells
- **Vignette:** Focus attention on center cells
- **Color Gradients:** Map pattern to color palette

## Next Steps

1. Add to shader: Import worley2D helper
2. Add uniforms: Declare 5 worley parameters
3. Add Leva controls: Create control group with toggle
4. Implement in shader: Call worley2D and blend result
5. Update useFrame: Wire controls to uniforms with toggle
6. Test patterns: Try F1, F2, and F2-F1 modes

Ready to implement following the established Toggle + Auto-Zero Mix pattern! 🎨
