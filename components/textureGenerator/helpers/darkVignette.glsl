#pragma glslify: vignette = require(./vignette.glsl)

/**
 * Dark Vignette - Darken edges
 * 
 * @param uv - Centered UV coordinates (e.g., uv - 0.5)
 * @param strength - Effect intensity (0-1)
 * @return float - Multiplier (multiply with color)
 * 
 * CONTROL OPTIONS for Leva:
 * - strength: { value: 0.6, min: 0.0, max: 1.0, step: 0.01 }
 * Note: For full control, use vignette.glsl directly
 */
float darkVignette(vec2 uv, float strength) {
    return vignette(uv, strength, 0.3, 0.6, true);
}

#pragma glslify: export(darkVignette)
