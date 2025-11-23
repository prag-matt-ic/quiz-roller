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
 * 
 * CONTROL OPTIONS for Leva:
 * Palette A (DC Offset):
 * - aR: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * - aG: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * - aB: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * 
 * Palette B (Amplitude):
 * - bR: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * - bG: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * - bB: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
 * 
 * Palette C (Frequency):
 * - cR: { value: 1.0, min: 0.0, max: 2.0, step: 0.01 }
 * - cG: { value: 1.0, min: 0.0, max: 2.0, step: 0.01 }
 * - cB: { value: 0.5, min: 0.0, max: 2.0, step: 0.01 }
 * 
 * Palette D (Phase):
 * - dR: { value: 0.80, min: 0.0, max: 1.0, step: 0.01 }
 * - dG: { value: 0.90, min: 0.0, max: 1.0, step: 0.01 }
 * - dB: { value: 0.30, min: 0.0, max: 1.0, step: 0.01 }
 * 
 * Or use presets with dropdown:
 * - preset: { options: ['Default', 'Sunset', 'Ocean', 'Forest', 'Neon'] }
 */
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.283185 * (c * t + d));
}

#pragma glslify: export(palette)
