# Adding New Effects - Step-by-Step Guide

## Overview

This guide shows exactly how to add a new shader effect to the texture generator using the established Toggle + Auto-Zero Mix pattern.

## Example: Adding a "Radial Waves" Effect

Let's add a new effect that creates radial wave distortions from the center.

### Step 1: Create GLSL Helper Function

**File:** `components/textureGenerator/helpers/radialWaves.glsl`

```glsl
#pragma glslify: export(radialWaves)

// CONTROL OPTIONS (for Leva implementation):
// - frequency: 1.0-20.0, step 0.5 (number of waves)
// - amplitude: 0.0-0.5, step 0.01 (wave intensity)
// - speed: 0.0-2.0, step 0.1 (animation speed, 0 = static)
// - mix: 0.0-1.0, step 0.01 (blend amount)

/**
 * Generates radial waves emanating from center
 *
 * @param uv - UV coordinates (0-1)
 * @param center - Wave origin point (typically 0.5, 0.5)
 * @param frequency - Number of wave cycles (higher = more rings)
 * @param amplitude - Wave intensity (0-1, higher = stronger effect)
 * @param time - Time for animation (use uTime or 0.0 for static)
 * @param speed - Animation speed multiplier
 * @return float - Wave value (0-1)
 */
float radialWaves(vec2 uv, vec2 center, float frequency, float amplitude, float time, float speed) {
  vec2 toCenter = uv - center;
  float dist = length(toCenter);

  // Create radial wave pattern
  float wave = sin(dist * frequency - time * speed) * 0.5 + 0.5;

  // Apply amplitude
  return wave * amplitude;
}
```

### Step 2: Update Shader Uniforms Type

**File:** `components/textureGenerator/TextureShader.tsx`

Add to `BackgroundShaderUniforms` type:

```tsx
export type BackgroundShaderUniforms = {
  // ... existing uniforms

  // Radial Waves controls
  uWavesFrequency: number
  uWavesAmplitude: number
  uWavesSpeed: number
  uWavesMix: number
}
```

Add to `INITIAL_BACKGROUND_UNIFORMS`:

```tsx
export const INITIAL_BACKGROUND_UNIFORMS: BackgroundShaderUniforms = {
  // ... existing uniforms

  // Radial Waves defaults
  uWavesFrequency: 10.0,
  uWavesAmplitude: 0.2,
  uWavesSpeed: 1.0,
  uWavesMix: 0.3,
}
```

### Step 3: Add to Fragment Shader

**File:** `components/textureGenerator/shaders/background.frag`

Import at top:

```glsl
#pragma glslify: radialWaves = require(../helpers/radialWaves.glsl)
```

Declare uniforms (after existing uniforms):

```glsl
// Radial Waves uniforms
uniform float uWavesFrequency;
uniform float uWavesAmplitude;
uniform float uWavesSpeed;
uniform float uWavesMix;
```

Use in `main()` function:

```glsl
void main() {
    // ... existing code (fbm, grain, etc.)

    // Apply radial waves
    float waves = radialWaves(
        uv,
        vec2(0.5),
        uWavesFrequency,
        uWavesAmplitude,
        uTime,
        uWavesSpeed
    );
    color = mix(color, color + vec3(waves), uWavesMix);

    // ... vignette and final output
}
```

### Step 4: Add Leva Controls

**File:** `components/textureGenerator/TextureCanvas.tsx`

Add new control group (after existing controls):

```tsx
const wavesControls = useControls('Radial Waves', {
  wavesEnabled: {
    value: true,
    label: 'Enabled',
  },
  wavesFrequency: {
    value: INITIAL_BACKGROUND_UNIFORMS.uWavesFrequency,
    min: 1.0,
    max: 20.0,
    step: 0.5,
    label: 'Frequency',
  },
  wavesAmplitude: {
    value: INITIAL_BACKGROUND_UNIFORMS.uWavesAmplitude,
    min: 0.0,
    max: 0.5,
    step: 0.01,
    label: 'Amplitude',
  },
  wavesSpeed: {
    value: INITIAL_BACKGROUND_UNIFORMS.uWavesSpeed,
    min: 0.0,
    max: 2.0,
    step: 0.1,
    label: 'Speed',
  },
  wavesMix: {
    value: INITIAL_BACKGROUND_UNIFORMS.uWavesMix,
    min: 0.0,
    max: 1.0,
    step: 0.01,
    label: 'Mix Amount',
  },
})
```

### Step 5: Update useFrame Hook

**File:** `components/textureGenerator/TextureCanvas.tsx`

Add to `useFrame` (after existing uniform updates):

```tsx
useFrame((_, delta) => {
  // ... existing updates

  // Update Radial Waves uniforms - apply enabled toggle
  shaderRef.current.uWavesFrequency = wavesControls.wavesFrequency
  shaderRef.current.uWavesAmplitude = wavesControls.wavesAmplitude
  shaderRef.current.uWavesSpeed = wavesControls.wavesSpeed
  shaderRef.current.uWavesMix = wavesControls.wavesEnabled ? wavesControls.wavesMix : 0
})
```

**Key Pattern:** Zero out the **mix** parameter when disabled, pass through other parameters unchanged.

### Step 6: Test & Iterate

1. Start dev server: `npm run dev`
2. Navigate to `/dev/texture-generator`
3. Find new "Radial Waves" folder in Leva panel
4. Test:
   - ✓ Toggle Enabled on/off
   - ✓ Adjust Frequency slider
   - ✓ Adjust Amplitude slider
   - ✓ Adjust Speed slider (see animation)
   - ✓ Adjust Mix Amount slider
   - ✓ Export high-res with waves enabled
   - ✓ Export high-res with waves disabled

## Code Checklist

For every new effect, you need exactly these changes:

- [ ] **1 file:** `helpers/effectName.glsl` with GLSL function
- [ ] **2 lines:** Add to `BackgroundShaderUniforms` type (all uniform types)
- [ ] **N lines:** Add to `INITIAL_BACKGROUND_UNIFORMS` (default values)
- [ ] **1 line:** Import helper in `background.frag`
- [ ] **N lines:** Declare uniforms in `background.frag`
- [ ] **1-3 lines:** Call helper function in `main()`
- [ ] **~15 lines:** Add `useControls()` hook with toggle + parameters
- [ ] **N lines:** Update uniforms in `useFrame()` with toggle logic

**Total:** ~30-40 lines of code per effect

## Naming Conventions

Follow these patterns for consistency:

### GLSL Helper

- **File:** `camelCase.glsl` (e.g., `radialWaves.glsl`)
- **Function:** Same as filename (e.g., `radialWaves()`)
- **Export:** `#pragma glslify: export(functionName)`

### TypeScript

- **Uniforms:** `u` + EffectName + Parameter (e.g., `uWavesFrequency`)
- **Controls:** `effectNameControls` (e.g., `wavesControls`)
- **Leva Keys:** `effectNameParameter` (e.g., `wavesFrequency`)

### Leva

- **Folder:** Title Case with spaces (e.g., "Radial Waves")
- **Toggle:** `effectNameEnabled` (e.g., `wavesEnabled`)
- **Labels:** Human-readable (e.g., "Frequency", "Mix Amount")

## Common Parameters

Most effects need these parameters:

### Always Include

1. **Enabled toggle** (`boolean`, default `true`)
2. **Mix amount** (`float 0-1`, zeroed when disabled)

### Often Include

3. **Scale/Frequency** - Size of the effect pattern
4. **Amplitude/Intensity** - Strength before mixing
5. **Speed** - Animation rate (0 = static)

### Sometimes Include

6. **Octaves** - Detail levels (for noise-based effects)
7. **Offset/Position** - Where effect originates
8. **Rotation/Angle** - Directional effects

## Performance Considerations

### When Effect is Cheap (<50 operations)

✅ Use current pattern - effect computes even when disabled (mix = 0)

```glsl
// Radial waves: ~20 operations
float waves = radialWaves(...);  // Always computes
color = mix(color, ..., uWavesMix);  // Mix = 0 when disabled
```

**Performance impact when disabled:** <0.1ms

### When Effect is Expensive (>100 operations)

⚠️ Consider shader branching for very expensive effects

```glsl
#ifdef EFFECT_EXPENSIVE
  if (uEffectEnabled > 0.5) {  // Only compute if enabled
    float expensive = computeExpensiveEffect(...);
    color = mix(color, ..., uEffectMix);
  }
#endif
```

**When to use:**

- Effect has 100+ texture samples
- Effect uses loops or recursion
- Profiling shows >1ms when disabled
- Target is mobile/low-end GPU

Add bool uniform:

```tsx
uWavesEnabled: boolean // Add to uniforms type
uWavesEnabled: true // Add to initial uniforms
```

Update useFrame:

```tsx
shaderRef.current.uWavesEnabled = wavesControls.wavesEnabled // Pass bool
```

## Multi-Layer Effects

Some effects might have multiple sub-components:

```tsx
const complexControls = useControls('Complex Effect', {
  enabled: { value: true, label: 'Enabled' },

  // Layer 1
  layer1Intensity: { ... },
  layer1Mix: { ... },

  // Layer 2
  layer2Intensity: { ... },
  layer2Mix: { ... },

  // Master mix
  overallMix: { ... },
})

// In useFrame
shaderRef.current.uLayer1Mix = complexControls.enabled
  ? complexControls.layer1Mix
  : 0
shaderRef.current.uLayer2Mix = complexControls.enabled
  ? complexControls.layer2Mix
  : 0
```

Single toggle disables all layers.

## Testing Your Effect

### Visual Tests

1. **Enabled on:** Effect clearly visible
2. **Enabled off:** Effect completely disappears
3. **Mix at 0:** Same as disabled
4. **Mix at 1:** Full effect strength
5. **Seed change:** Effect responds to new seed
6. **High-res export:** Effect renders at full resolution

### Parameter Tests

1. **Min value:** Effect at minimum (but still working)
2. **Max value:** Effect at maximum (not broken/ugly)
3. **Mid value:** Sweet spot for most use cases
4. **Step size:** Smooth adjustments, not too coarse

### Integration Tests

1. **With other effects:** Layering looks good
2. **Toggle during animation:** Smooth transition
3. **Multiple toggles:** Independent enable/disable
4. **Export preserves settings:** Disabled effects stay disabled

## Documentation

Update these files when adding effects:

1. **LEVA_CONTROLS_GUIDE.md** - Add effect to folder structure
2. **EFFECT_TOGGLE_PATTERN.md** - Update count (now 4 effects → 5 effects)
3. **helpers/effectName.glsl** - CONTROL OPTIONS comment at top

## Example PR Description

```markdown
### Add Radial Waves Effect

Adds a new radial wave distortion effect with 4 parameters:

- Frequency (1-20): Number of wave rings
- Amplitude (0-0.5): Wave intensity
- Speed (0-2): Animation rate
- Mix (0-1): Blend amount

Following established Toggle + Auto-Zero Mix pattern:

- ✅ Enabled toggle in Leva
- ✅ All parameters in TypeScript uniforms
- ✅ GLSL helper with inline docs
- ✅ Integrated in useFrame with conditional mix
- ✅ Defaults tuned for subtle effect

Tested:

- [x] Toggle on/off works
- [x] Parameters adjust smoothly
- [x] High-res export includes effect
- [x] No performance regression (<0.2ms)
```

## Quick Reference

**Minimum viable effect in 5 steps:**

1. Create `helpers/effect.glsl` with function
2. Add types to `TextureShader.tsx`
3. Import + use in `background.frag`
4. Add `useControls('Effect Name', { enabled, params })`
5. Add to `useFrame()`: `uEffectMix = enabled ? mix : 0`

Done! Effect is now fully integrated with toggle support.
