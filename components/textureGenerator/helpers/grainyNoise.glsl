// Hash function for pseudo-random values
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

/**
 * Grainy Noise - High-frequency noise with amplification
 * 
 * @param uv - UV coordinates
 * @param scale - Frequency/scale of noise (higher = more grain)
 * @param amplitude - Amplification multiplier (higher = stronger grain)
 * @return float - Noise value in range [0, 1] (or beyond if amplitude > 1)
 * 
 * CONTROL OPTIONS for Leva:
 * - scale: { value: 256.0, min: 32, max: 1024, step: 32 }
 * - amplitude: { value: 1.5, min: 0.0, max: 5.0, step: 0.1 }
 * - mix: { value: 0.1, min: 0.0, max: 1.0, step: 0.01 } // How much grain to blend
 */
float grainyNoise(vec2 uv, float scale, float amplitude) {
    // High-frequency hash-based noise
    vec2 p = uv * scale;
    float n = hash(floor(p) + fract(p));
    
    // Amplify and center around 0.5
    return 0.5 + (n - 0.5) * amplitude;
}

#pragma glslify: export(grainyNoise)
