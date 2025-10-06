# Background Texture Generator

Developer-only tool for generating background textures using custom GLSL shaders.

## Location

`/dev/texture-generator`

## Features

- **Real-time preview**: See your shader in action at 512x512 resolution
- **High-resolution export**: Download JPGs at 1024px, 2048px, or 4096px
- **Seed-based generation**: Create reproducible variations using numeric seeds
- **GPU-accelerated**: All rendering happens on the GPU using Three.js and WebGL

## Usage

1. Navigate to `/dev/texture-generator` in your browser (dev environment only)
2. The preview canvas will display the current shader output in real-time
3. Adjust the **Seed** value to see different variations
4. Select your desired **Resolution** (1024, 2048, or 4096 pixels)
5. Click **Download JPG** to export the current texture

## Technical Details

### Architecture

- **Canvas Component** (`TextureCanvas.tsx`): Handles Three.js setup and capture logic
- **Shader Material** (`TextureShader.tsx`): Custom shader material with uniforms
- **Fragment Shader** (`background.frag`): Main texture generation logic
- **Vertex Shader** (`background.vert`): NDC-space screen quad positioning
- **Helper Functions** (`helpers.glsl`): Reusable GLSL utilities (noise, vignette, etc.)

### Shader Uniforms

- `uTime`: Accumulated time (for animation, currently unused)
- `uResolution`: Canvas resolution as vec2
- `uSeed`: Random seed for variation

### Integration

The shader uses the project's existing **palette system** (`palette.glsl`) to generate colors based on IQ's cosine palette technique.

**New helper functions** (`helpers.glsl`) provide reusable utilities:

- `grainyNoise()`: High-frequency noise for film grain and texture
- `fractalNoise()`: Multi-octave FBM for organic patterns
- `darkVignette()` / `lightVignette()`: Radial edge darkening/lightening
- `vignette()`: Fully customizable vignette function

See `HELPERS_EXAMPLES.md` for detailed usage examples and parameters.

The texture blends palette colors with dark grey, adds layered noise, and applies vignetting for atmospheric depth.

### Performance

Follows project performance guidelines (AGENTS.md):

- Pre-allocated Vector2 objects (no per-frame allocations)
- Refs for mutable state (time, seed)
- In-place uniform updates using `.set()` methods

## Future Enhancements

- Shader parameter controls (sliders for noise scale, color mixing, etc.)
- Animation toggle with time-based effects
- Multiple shader presets (dropdown/tabs)
- Preset save/load system
- Batch generation with seed ranges

## Development Notes

- TypeScript errors about missing modules should resolve after language server reload
- The `@ts-expect-error` comment for shader material refs is expected (drei typing limitation)
- Download uses `canvas.toBlob()` with 95% JPEG quality
- High-res rendering temporarily resizes the canvas, then restores preview size
