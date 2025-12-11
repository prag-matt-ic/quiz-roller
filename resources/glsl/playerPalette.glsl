// Import cosine palette function
#pragma glslify: palette = require('./palette.glsl')

void getPlayerPaletteParams(in int index, out vec3 a, out vec3 b, out vec3 c, out vec3 d) {
    if (index == 1) {
        a = vec3(1.000, 0.500, 0.500);
        b = vec3(0.500, 0.500, 0.500);
        c = vec3(0.568, 1.000, 0.667);
        d = vec3(0.800, 1.000, 0.333);
        return;
    }
    if (index == 2) {
        a = vec3(0.530, 0.390, 0.340);
        b = vec3(0.440, 0.530, 0.530);
        c = vec3(1.020, 0.802, 0.625);
        d = vec3(0.245, 0.275, 0.319);
        return;
    }
    if (index == 3) {
        a = vec3(0.500, 0.500, 0.500);
        b = vec3(0.500, 0.500, 0.500);
        c = vec3(1.000, 0.700, 0.400);
        d = vec3(0.000, 0.150, 0.200);
        return;
    }

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
