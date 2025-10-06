# Helpers.glsl Usage Examples

This file contains reusable GLSL helper functions for texture generation.

## Import with glslify

```glsl
#pragma glslify: grainyNoise = require(../helpers.glsl, grainyNoise)
#pragma glslify: fractalNoise = require(../helpers.glsl, fractalNoise)
#pragma glslify: darkVignette = require(../helpers.glsl, darkVignette)
#pragma glslify: lightVignette = require(../helpers.glsl, lightVignette)
#pragma glslify: vignette = require(../helpers.glsl, vignette)
```

## Function Reference

### 1. Grainy Noise

High-frequency noise perfect for film grain, dust, or texture overlays.

```glsl
float grainyNoise(vec2 uv, float scale, float amplitude)
```

**Parameters:**

- `uv`: UV coordinates
- `scale`: Frequency (higher = more grain density). Try 64-512
- `amplitude`: Amplification (higher = stronger). Try 0.5-2.0

**Examples:**

```glsl
// Subtle film grain
float grain = grainyNoise(vUv, 256.0, 0.5);
color += (grain - 0.5) * 0.05; // Add centered grain

// Heavy paper texture
float paper = grainyNoise(vUv, 128.0, 2.0);
color *= paper; // Multiply for texture

// Animated TV static
float static = grainyNoise(vUv + uTime * 10.0, 512.0, 3.0);
```

---

### 2. Fractal Noise (FBM)

Organic, natural-looking noise using multiple octaves. Great for clouds, smoke, terrain.

```glsl
// Full signature
float fractalNoise(vec2 uv, int octaves, float lacunarity, float gain)

// Simplified (uses defaults: lacunarity=2.0, gain=0.5)
float fractalNoise(vec2 uv, int octaves)
```

**Parameters:**

- `uv`: UV coordinates
- `octaves`: Detail layers (more = more detail, slower). Try 3-6
- `lacunarity`: Frequency multiplier per octave (typically 2.0)
- `gain`: Amplitude multiplier per octave (typically 0.5)

**Examples:**

```glsl
// Soft cloud-like pattern
float clouds = fractalNoise(vUv * 2.0, 4);
color = mix(skyBlue, white, clouds);

// Animated flowing smoke
float smoke = fractalNoise(vUv * 3.0 + uTime * 0.1, 5);

// Terrain heightmap
float terrain = fractalNoise(vUv * 10.0, 6, 2.0, 0.5);

// Custom lacunarity/gain for different character
float rough = fractalNoise(vUv * 5.0, 4, 3.0, 0.6); // Sharper features
float smooth = fractalNoise(vUv * 5.0, 4, 2.0, 0.3); // Smoother blending
```

---

### 3. Vignette

Radial darkening or lightening from center to edges.

```glsl
// Full control
float vignette(vec2 uv, float strength, float radius, float smoothness, bool isDark)

// Dark vignette (darken edges)
float darkVignette(vec2 uv, float strength)

// Light vignette (lighten edges)
float lightVignette(vec2 uv, float strength)
```

**Parameters:**

- `uv`: **Centered** UV coordinates (use `vUv - 0.5`)
- `strength`: Effect intensity (0 = none, 1 = full). Try 0.3-0.8
- `radius`: Where effect starts (0 = center, 1 = edges)
- `smoothness`: Gradient softness (higher = softer transition)
- `isDark`: true for darkening, false for lightening

**Examples:**

```glsl
// Simple dark vignette (most common)
vec2 centeredUv = vUv - 0.5;
float vig = darkVignette(centeredUv, 0.5);
color *= vig; // Darken edges

// Subtle light vignette (glow effect)
float glow = lightVignette(centeredUv, 0.3);
color *= glow;

// Custom vignette with full control
float customVig = vignette(
    centeredUv,
    0.8,    // Strong effect
    0.2,    // Start close to center
    0.5,    // Medium smoothness
    true    // Dark vignette
);
color *= customVig;

// Dramatic spotlight effect
float spotlight = vignette(centeredUv, 0.95, 0.1, 0.3, true);
color *= spotlight;

// Screen-space glow (light vignette)
float screenGlow = lightVignette(centeredUv, 0.5);
color = color * (1.0 - 0.5) + vec3(1.0) * 0.5 * (screenGlow - 1.0); // Screen blend
```

---

## Combined Examples

### Film Grain + Vignette

```glsl
void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv - 0.5;

    // Base color
    vec3 color = getColourFromPalette(length(centeredUv));

    // Add film grain
    float grain = grainyNoise(uv, 256.0, 1.0);
    color += (grain - 0.5) * 0.08;

    // Apply vignette
    color *= darkVignette(centeredUv, 0.6);

    gl_FragColor = vec4(color, 1.0);
}
```

### Fractal Noise Background with Grain

```glsl
void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv - 0.5;

    // Organic base pattern
    float fbm = fractalNoise(uv * 4.0 + uSeed, 4);

    // Add texture with grain
    float grain = grainyNoise(uv, 128.0, 0.8);
    float combined = fbm * 0.8 + (grain - 0.5) * 0.2;

    // Map to colors
    vec3 color = getColourFromPalette(combined);

    // Darken edges
    color *= darkVignette(centeredUv, 0.5);

    gl_FragColor = vec4(color, 1.0);
}
```

### Animated Clouds with Glow

```glsl
void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv - 0.5;

    // Flowing clouds
    float clouds = fractalNoise(uv * 3.0 + vec2(uTime * 0.1, 0.0), 5);

    // Map to sky gradient
    vec3 skyColor = mix(
        vec3(0.3, 0.5, 0.8),  // Sky blue
        vec3(0.9, 0.95, 1.0), // Cloud white
        clouds
    );

    // Add subtle light vignette for glow
    float glow = lightVignette(centeredUv, 0.2);
    skyColor *= glow;

    gl_FragColor = vec4(skyColor, 1.0);
}
```

---

## Performance Notes

- **Grainy noise**: Very fast (single hash calculation)
- **Fractal noise**: Moderate cost, scales with octave count
  - 3-4 octaves: Good for real-time
  - 5-6 octaves: Fine for export/high-quality
  - 7+ octaves: Use sparingly
- **Vignette**: Very fast (distance + smoothstep)

## Tips

1. **Grain amplitude > 1.0** can clip to white - use for stylistic effect
2. **Fractal octaves**: Start low (3-4) and increase until you see desired detail
3. **Vignette on centered UVs**: Always use `vUv - 0.5` for proper centering
4. **Animate noise**: Add `uTime` to UV coordinates for movement
5. **Layer noises**: Combine multiple scales/types for rich textures
