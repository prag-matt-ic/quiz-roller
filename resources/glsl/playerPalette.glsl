// Import cosine palette function
#pragma glslify: palette = require('./palette.glsl')

void getPlayerPaletteParams(in int index, out vec3 a, out vec3 b, out vec3 c, out vec3 d) {
    // Pink
    if (index == 1) {
        a = vec3(1.000, 0.500, 0.500);
        b = vec3(0.500, 0.500, 0.500);
        c = vec3(0.568, 1.000, 0.667);
        d = vec3(0.800, 1.000, 0.333);
        return;
    }
    // Blue
    if (index == 2) {
        a = vec3(0.200, 0.470, 0.542);
        b = vec3(0.731, 0.486, 0.400);
        c = vec3(0.619, 0.864, 0.950);
        d = vec3(0.380, 0.290, 0.280);
        return;
    }
    // Mixed
    if (index == 3) {
        a = vec3(0.500, 0.500, 0.500);
        b = vec3(0.500, 0.500, 0.500);
        c = vec3(1.000, 0.700, 0.400);
        d = vec3(0.000, 0.150, 0.200);
        return;
    }

    // Default palette (0)
    a = vec3(0.470, 0.500, 0.500);
    b = vec3(0.500, 0.500, 0.500);
    c = vec3(1.000, 1.000, 0.490);
    d = vec3(0.750, 0.910, 0.300);
}

// Player palette sampling by index
vec3 samplePlayerPalette(in float t, in int paletteIndex) {
    vec3 a;
    vec3 b;
    vec3 c;
    vec3 d;
    getPlayerPaletteParams(paletteIndex, a, b, c, d);
    return palette(t, a, b, c, d);
}

vec3 getColourFromPalette(in int paletteIndex, in float t) {
    return samplePlayerPalette(t, paletteIndex);
}

// Overload to support (t, paletteIndex) call order.
vec3 getColourFromPalette(in float t, in int paletteIndex) {
    return samplePlayerPalette(t, paletteIndex);
}

#pragma glslify: export(samplePlayerPalette)
#pragma glslify: export(getColourFromPalette)
