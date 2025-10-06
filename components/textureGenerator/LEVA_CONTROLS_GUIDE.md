# Leva Controls Integration Guide

## Overview

The texture generator now includes real-time interactive controls powered by Leva. All shader parameters can be adjusted live in the browser.

## Implementation Structure

### Control Groups

Controls are organized into 3 folders in the Leva GUI:

#### 1. Grainy Noise

- **Scale** (32-1024, step 32, default: 256)
  - Controls the frequency of the grain pattern
  - Higher values = finer grain
- **Amplitude** (0-5, step 0.1, default: 1.5)
  - Controls the intensity of the grain effect
  - Higher values = more visible grain
- **Mix Amount** (0-1, step 0.01, default: 0.1)
  - Controls how much grain is blended with the base texture
  - 0 = no grain, 1 = full grain effect

#### 2. Fractal Noise (FBM)

- **Scale** (0.5-16, step 0.5, default: 2.0)
  - Base frequency of the fractal pattern
  - Lower values = larger features
- **Octaves** (1-8, step 1, default: 4)
  - Number of noise layers to combine
  - More octaves = more detail (but slower)
- **Lacunarity** (1-4, step 0.1, default: 2.0)
  - Frequency multiplier between octaves
  - Higher values = more contrast between detail levels
- **Gain** (0.1-1, step 0.05, default: 0.5)
  - Amplitude multiplier between octaves
  - Lower values = smoother, higher = rougher
- **Mix Amount** (0-1, step 0.01, default: 0.5)
  - Controls how much FBM is blended with the base texture
  - 0 = no FBM, 1 = full FBM effect

#### 3. Vignette

- **Strength** (0-1, step 0.01, default: 0.3)
  - Overall intensity of the vignette effect
  - 0 = no vignette, 1 = maximum darkening at edges
- **Radius** (0-1, step 0.01, default: 0.5)
  - How far the vignette extends from center
  - Lower values = larger bright center area
- **Smoothness** (0-1, step 0.01, default: 0.5)
  - Controls the softness of the vignette transition
  - 0 = hard edge, 1 = very smooth gradient

## Technical Implementation

### Uniforms

All Leva controls are connected to shader uniforms via `useFrame`:

```typescript
useFrame(() => {
  if (shaderRef.current) {
    // Grainy Noise
    shaderRef.current.uGrainScale = grainControls.grainScale
    shaderRef.current.uGrainAmplitude = grainControls.grainAmplitude
    shaderRef.current.uGrainMix = grainControls.grainMix

    // Fractal Noise (FBM)
    shaderRef.current.uFbmScale = fbmControls.fbmScale
    shaderRef.current.uFbmOctaves = fbmControls.fbmOctaves
    shaderRef.current.uFbmLacunarity = fbmControls.fbmLacunarity
    shaderRef.current.uFbmGain = fbmControls.fbmGain
    shaderRef.current.uFbmMix = fbmControls.fbmMix

    // Vignette
    shaderRef.current.uVignetteStrength = vignetteControls.vignetteStrength
    shaderRef.current.uVignetteRadius = vignetteControls.vignetteRadius
    shaderRef.current.uVignetteSmoothness = vignetteControls.vignetteSmoothness
  }
})
```

### Shader Usage

In `background.frag`, uniforms are declared and used:

```glsl
uniform float uGrainScale;
uniform float uGrainAmplitude;
uniform float uGrainMix;
// ... etc

void main() {
  vec2 uv = vUv;
  vec3 color = vec3(0.1);

  // Apply grainy noise
  float grain = grainyNoise(uv, uGrainScale, uGrainAmplitude);
  color = mix(color, vec3(grain), uGrainMix);

  // Apply fractal noise
  float fbm = fractalNoise(uv, uFbmScale, int(uFbmOctaves), uFbmLacunarity, uFbmGain);
  color = mix(color, vec3(fbm), uFbmMix);

  // Apply vignette
  color = darkVignette(uv, color, uVignetteStrength, uVignetteRadius, uVignetteSmoothness);

  gl_FragColor = vec4(color, 1.0);
}
```

## Future Enhancements

### Palette Controls (TODO)

Could add a 4th folder for IQ cosine palette controls:

- 12 RGB parameters (aR, aG, aB, bR, bG, bB, cR, cG, cB, dR, dG, dB)
- Preset dropdown with common palettes (sunset, ocean, forest, etc.)

### Additional Features

- Save/load preset configurations
- Animation controls (time-based parameter modulation)
- Export settings with generated image
- Multiple noise layers with independent controls

## Usage Tips

1. **Start with defaults** - The default values produce a good base texture
2. **Adjust one parameter at a time** - See the effect of each control
3. **Mix amounts are powerful** - Use them to blend effects subtly
4. **Octaves impact performance** - Keep at 4-6 for smooth interaction
5. **Test high-res export** - Settings apply to exported images too

## Troubleshooting

If Leva controls don't appear:

1. Check browser console for errors
2. Verify Leva is installed: `npm list leva`
3. Clear cache: `rm -rf .next node_modules/.cache`
4. Restart dev server: `npm run dev`

If shader doesn't update:

1. Check that uniforms match between TextureShader.tsx and background.frag
2. Verify useFrame hook is running (add console.log)
3. Check shader compilation errors in browser console
