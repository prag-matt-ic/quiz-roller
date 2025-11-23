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
 * 
 * CONTROL OPTIONS for Leva:
 * - scale: { value: 4.0, min: 0.5, max: 16.0, step: 0.5 } // Base frequency multiplier
 * - octaves: { value: 4, min: 1, max: 8, step: 1 }
 * - lacunarity: { value: 2.0, min: 1.0, max: 4.0, step: 0.1 }
 * - gain: { value: 0.5, min: 0.1, max: 1.0, step: 0.05 }
 * - mix: { value: 0.3, min: 0.0, max: 1.0, step: 0.01 } // How much FBM to blend
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
