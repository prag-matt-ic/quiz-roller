// Helper functions for texture generation

// ==========================================
// COLOR FUNCTIONS
// ==========================================

/**
 * Cosine-based color palette (IQ's technique)
 * https://iquilezles.org/articles/palettes/
 * 
 * @param t - Parameter value (typically 0-1 but can be outside)
 * @param a - DC offset (base color)
 * @param b - Amplitude
 * @param c - Frequency
 * @param d - Phase offset
 * @return vec3 - RGB color
 */
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.283185 * (c * t + d));
}

#pragma glslify: export(palette)

// ==========================================
// NOISE FUNCTIONS
// ==========================================

// Hash function for pseudo-random values
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Simple value noise
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/**
 * Grainy Noise - High-frequency noise with amplification
 * 
 * @param uv - UV coordinates
 * @param scale - Frequency/scale of noise (higher = more grain)
 * @param amplitude - Amplification multiplier (higher = stronger grain)
 * @return float - Noise value in range [0, 1] (or beyond if amplitude > 1)
 */
float grainyNoise(vec2 uv, float scale, float amplitude) {
    // High-frequency hash-based noise
    vec2 p = uv * scale;
    float n = hash(floor(p) + fract(p));
    
    // Amplify and center around 0.5
    return 0.5 + (n - 0.5) * amplitude;
}

#pragma glslify: export(grainyNoise)

/**
 * Fractal Noise (FBM - Fractal Brownian Motion)
 * 
 * Layers multiple octaves of noise with decreasing amplitude and increasing frequency
 * Creates organic, natural-looking patterns
 * 
 * @param uv - UV coordinates
 * @param octaves - Number of noise layers (more = more detail, more expensive)
 * @param lacunarity - Frequency multiplier per octave (typically 2.0)
 * @param gain - Amplitude multiplier per octave (typically 0.5)
 * @return float - Noise value in approximate range [0, 1]
 */
float fractalNoise(vec2 uv, int octaves, float lacunarity, float gain) {
    float total = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0; // Normalization factor
    
    for (int i = 0; i < octaves; i++) {
        total += valueNoise(uv * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    
    // Normalize to [0, 1] range
    return total / maxValue;
}

#pragma glslify: export(fractalNoise)

// ==========================================
// VIGNETTE FUNCTIONS
// ==========================================

/**
 * Vignette - Radial darkening or lightening from edges
 * 
 * @param uv - UV coordinates (typically centered, e.g., uv - 0.5)
 * @param strength - How strong the effect is (0 = none, 1 = full)
 * @param radius - Where effect starts (0 = center, 1 = edges)
 * @param smoothness - How gradual the transition is (higher = softer)
 * @param isDark - true for darkening (multiply), false for lightening (screen blend)
 * @return float - Multiplier to apply to color
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

// Convenience wrappers with sensible defaults

/**
 * Dark Vignette - Darken edges
 * 
 * @param uv - Centered UV coordinates (e.g., uv - 0.5)
 * @param strength - Effect intensity (0-1)
 * @return float - Multiplier (multiply with color)
 */
float darkVignette(vec2 uv, float strength) {
    return vignette(uv, strength, 0.3, 0.6, true);
}

#pragma glslify: export(darkVignette)

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


// https://stack.gl/packages/#stackgl/glsl-hash-blur