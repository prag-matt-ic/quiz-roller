// Import cosine palette function
#pragma glslify: palette = require('./palette.glsl')

// Player palette
vec3 samplePlayerPalette(in float t) {
vec3 a = vec3(0.470, 0.500, 0.500);
vec3 b = vec3(0.500, 0.500, 0.500);
vec3 c = vec3(1.000, 1.000, 0.490);
vec3 d = vec3(0.750, 0.910, 0.300);
    return palette(t, a, b, c, d);
}

#pragma glslify: export(samplePlayerPalette)


//  ORIGINAL 
//     vec3 a = vec3(0.5, 0.5, 0.5);
//     vec3 b = vec3(0.5, 0.5, 0.5);
//     vec3 c = vec3(1.0, 1.0, 0.5);
//     vec3 d = vec3(0.80, 0.90, 0.30);

// ALTERNATIVE PALETTES
// vec3 a = vec3(0.470, 0.500, 0.500);
// vec3 b = vec3(0.500, 0.500, 0.500);
// vec3 c = vec3(1.000, 1.000, 0.490);
// vec3 d = vec3(0.750, 0.910, 0.300);