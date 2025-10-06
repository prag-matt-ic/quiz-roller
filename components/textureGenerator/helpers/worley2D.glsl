// Import worley2D from glsl-worley npm package
// Keep the function as-is from the library
#pragma glslify: worley = require(glsl-worley/worley2D.glsl)

// CONTROL OPTIONS (for Leva implementation):
// - scale: 0.5-20.0, step 0.5 (frequency of cells, higher = more cells)
// - jitter: 0.0-1.0, step 0.01 (randomness of cell centers, 0 = grid, 1 = full random)
// - manhattanDistance: boolean toggle (use Manhattan vs Euclidean distance)
// - patternType: dropdown ["F1", "F2", "F2-F1"] (which feature point distances to use)
// - mix: 0.0-1.0, step 0.01 (blend amount with base color)

/**
 * Worley Noise (Cellular/Voronoi) - 2D version
 * 
 * Generates cellular patterns by computing distances to nearest feature points.
 * Creates distinctive cell/stone-like patterns useful for textures like rock,
 * biological cells, cracked surfaces, or abstract cellular designs.
 * 
 * This is a wrapper around the glsl-worley library's worley2D function.
 * The original implementation is by Stefan Gustavson:
 * http://webstaff.itn.liu.se/~stegu/GLSL-cellular/GLSL-cellular-notes.pdf
 * 
 * @param P - 2D input coordinates (vec2)
 * @param jitter - Amount of randomness in cell centers (0.0-1.0)
 *                 0.0 = perfect grid (no jitter)
 *                 1.0 = fully randomized cell centers
 * @param manhattanDistance - If true, uses Manhattan distance (|x| + |y|)
 *                            If false, uses Euclidean distance (sqrt(x² + y²))
 *                            Manhattan creates more "jagged" square-like patterns
 * 
 * @return vec2 containing:
 *         .x = F1 (distance to nearest feature point)
 *         .y = F2 (distance to 2nd nearest feature point)
 * 
 * Common pattern types:
 * - F1: Creates classic cell/voronoi pattern (use .x)
 * - F2: Creates ring-like patterns around cells (use .y)
 * - F2-F1: Creates cell borders/edges (use .y - .x)
 * 
 * Usage example:
 *   vec2 F = worley2D(uv * 5.0, 1.0, false);
 *   float pattern = F.y - F.x;  // Cell edges
 *   color = mix(color, vec3(pattern), 0.5);
 * 
 * Performance: Fast - uses 2x3 search window for efficiency
 * Quality: Good for most purposes, slight artifacts at high magnification
 * 
 * Library: glsl-worley by Erkaman
 * License: MIT
 * Repository: https://github.com/Erkaman/glsl-worley
 */
vec2 worley2D(vec2 P, float jitter, bool manhattanDistance) {
    return worley(P, jitter, manhattanDistance);
}

#pragma glslify: export(worley2D)
