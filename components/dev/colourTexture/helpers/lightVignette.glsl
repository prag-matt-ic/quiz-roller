#pragma glslify: vignette = require(./vignette.glsl)

/**
 * Light Vignette - Lighten edges
 * 
 * @param uv - Centered UV coordinates (e.g., uv - 0.5)
 * @param strength - Effect intensity (0-1)
 * @return float - Multiplier (multiply with color or use for screen blend)
 */
float lightVignette(vec2 uv, float strength) {
    return vignette(uv, strength, 0.3, 0.6, false);
}

#pragma glslify: export(lightVignette)
