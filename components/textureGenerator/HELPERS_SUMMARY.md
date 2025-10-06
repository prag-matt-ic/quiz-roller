# helpers.glsl - GLSL Utility Functions

Reusable shader helper functions for the texture generator, following glslify export patterns.

## Files Created

1. **`helpers.glsl`** - Main helper library with three function families
2. **`HELPERS_EXAMPLES.md`** - Comprehensive usage guide with examples
3. **`background.frag`** - Updated to use new helpers

## Function Summary

### 📺 Grainy Noise

```glsl
float grainyNoise(vec2 uv, float scale, float amplitude)
```

- High-frequency hash-based noise
- Perfect for film grain, dust, paper texture
- Very fast (single calculation)
- Amplitude > 1.0 for dramatic effects

### 🌫️ Fractal Noise (FBM)

```glsl
float fractalNoise(vec2 uv, int octaves, float lacunarity, float gain)
float fractalNoise(vec2 uv, int octaves) // Simplified with defaults
```

- Multi-octave layered noise
- Creates organic, natural patterns
- Use for clouds, smoke, terrain, marble
- 3-4 octaves for real-time, 5-6 for exports

### 🎭 Vignette

```glsl
float vignette(vec2 uv, float strength, float radius, float smoothness, bool isDark)
float darkVignette(vec2 uv, float strength)  // Convenience wrapper
float lightVignette(vec2 uv, float strength) // Convenience wrapper
```

- Radial darkening or lightening from center
- Requires centered UVs (`vUv - 0.5`)
- Dark = multiply for edge darkening
- Light = add for center glow

## Implementation Details

### Export Pattern (glslify)

```glsl
#pragma glslify: export(functionName)
```

All functions are properly exported and can be imported with:

```glsl
#pragma glslify: grainyNoise = require(../helpers.glsl, grainyNoise)
```

### Hash Function

Uses standard `sin(dot())` hash for pseudo-random values:

```glsl
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
```

### Value Noise

Implements basic value noise with smoothstep interpolation:

- Grid-based with integer and fractional parts
- 4-point bilinear interpolation
- Smooth transitions between noise values

### FBM Implementation

Classic fractal Brownian motion:

- Accumulates multiple octaves with decreasing amplitude
- Each octave has higher frequency (× lacunarity)
- Each octave has lower amplitude (× gain)
- Normalized to [0, 1] range

### Vignette Implementation

Distance-based radial effect:

- Uses `length()` for circular falloff
- `smoothstep()` for soft transitions
- Boolean parameter for dark vs light mode
- Convenience wrappers with sensible defaults

## Usage in background.frag

The updated shader demonstrates all three helpers:

```glsl
// Fractal noise for organic base (4 octaves)
float fbm = fractalNoise(uv * 4.0 + uSeed, 4);

// Grainy noise for texture (high frequency, amplified)
float grain = grainyNoise(uv + uSeed * 0.1, 256.0, 1.5);

// Combine with distance gradient
float t = dist + fbm * 0.3 + (grain - 0.5) * 0.1;

// Apply dark vignette to final color
float vignetteAmount = darkVignette(centeredUv, 0.6);
color *= vignetteAmount;
```

## Performance Characteristics

| Function            | Cost      | Notes                 |
| ------------------- | --------- | --------------------- |
| `grainyNoise`       | Very Fast | Single hash call      |
| `fractalNoise(3-4)` | Fast      | Good for real-time    |
| `fractalNoise(5-6)` | Medium    | Fine for exports      |
| `fractalNoise(7+)`  | Slow      | Use sparingly         |
| `vignette`          | Very Fast | Distance + smoothstep |

## Testing Recommendations

1. **Grain scale**: Try 64, 128, 256, 512 for different densities
2. **Grain amplitude**: 0.5 = subtle, 1.5 = medium, 3.0+ = extreme
3. **FBM octaves**: Start at 3-4, increase until detail satisfies
4. **Vignette strength**: 0.3 = subtle, 0.6 = medium, 0.9+ = dramatic
5. **Animation**: Add `uTime` to UV coordinates for movement

## Future Extensions

Potential additions to helpers.glsl:

- Simplex/Perlin noise (smoother than value noise)
- Voronoi/cellular noise (organic cells)
- Domain warping (distortion effects)
- Color grading helpers (contrast, saturation, etc.)
- Geometric patterns (stripes, checkers, etc.)
