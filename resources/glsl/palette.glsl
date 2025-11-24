
// https://iquilezles.org/articles/palettes/

// Cosine based palette, 4 vec3 params
vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(6.283185 * (c * t + d));
}

#pragma glslify: export(palette)
