
// https://iquilezles.org/articles/palettes/

// Cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ){
    return a + b * cos(6.283185 * (c * t + d));
}

vec3 getColourFromPalette(in float t) {
    // IQ cosine palette parameters (a, b, c, d)
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.80, 0.90, 0.30);
    return palette(t, a, b, c, d);
}

// Export for use in other shaders
#pragma glslify: export(getColourFromPalette)