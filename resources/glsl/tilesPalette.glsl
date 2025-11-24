// Import cosine palette function
#pragma glslify: palette = require('./palette.glsl')

// Tiles palette
vec3 sampleTilesPalette(in float t) {
vec3 a = vec3(0.200, 0.542, 0.542);
vec3 b = vec3(0.970, 0.470, 0.430);
vec3 c = vec3(0.590, 0.950, 0.950);
vec3 d = vec3(0.400, 0.275, 0.275);
    return palette(t, a, b, c, d);
}



#pragma glslify: export(sampleTilesPalette)


    // vec3 a = vec3(0.210, 0.520, 0.542);
    // vec3 b = vec3(0.735, 0.400, 0.400);
    // vec3 c = vec3(0.615, 1.020, 1.070);
    // vec3 d = vec3(0.359, 0.275, 0.260);