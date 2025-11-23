// TODO: remove dark/light vignette and just implement this one shader with 'is dark' boolean control


/**
 * Vignette - Radial darkening or lightening from edges
 * 
 * @param uv - UV coordinates (typically centered, e.g., uv - 0.5)
 * @param strength - How strong the effect is (0 = none, 1 = full)
 * @param radius - Where effect starts (0 = center, 1 = edges)
 * @param smoothness - How gradual the transition is (higher = softer)
 * @param isDark - true for darkening (multiply), false for lightening (screen blend)
 * @return float - Multiplier to apply to color
 * 
 * CONTROL OPTIONS for Leva:
 * - strength: { value: 0.6, min: 0.0, max: 1.0, step: 0.01 }
 * - radius: { value: 0.3, min: 0.0, max: 1.0, step: 0.01 }
 * - smoothness: { value: 0.6, min: 0.0, max: 1.0, step: 0.01 }
 * - isDark: { value: true } // Toggle between dark/light
 */
float vignette(vec2 uv, float strength, float radius, float smoothness, bool isDark) {
    // Distance from center (assumes uv is centered)
    float dist = length(uv);
    
    // Create falloff from radius to edge
    float falloff = smoothstep(radius, radius + smoothness, dist);
    
    if (isDark) {
        // Dark vignette: fade to black at edges
        return 1.0 - (falloff * strength);
    } else {
        // Light vignette: fade to white at edges
        return 1.0 + (falloff * strength);
    }
}

#pragma glslify: export(vignette)
