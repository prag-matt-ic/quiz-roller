
// https://iquilezles.org/articles/palettes/

// Cosine based palette, 4 vec3 params
vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(6.283185 * (c * t + d));
}

const vec3 PALETTE_PURPLE_GOLD_A = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_PURPLE_GOLD_B = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_PURPLE_GOLD_C = vec3(1.0, 0.7, 0.4);
const vec3 PALETTE_PURPLE_GOLD_D = vec3(0.0, 0.15, 0.20);

const vec3 PALETTE_YELLOW_GREEN_A = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_YELLOW_GREEN_B = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_YELLOW_GREEN_C = vec3(1.0, 1.0, 0.5);
const vec3 PALETTE_YELLOW_GREEN_D = vec3(0.8, 0.9, 0.3);

const vec3 PALETTE_ORANGE_BLUE_A = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_ORANGE_BLUE_B = vec3(0.5, 0.5, 0.5);
const vec3 PALETTE_ORANGE_BLUE_C = vec3(0.8, 0.8, 0.5);
const vec3 PALETTE_ORANGE_BLUE_D = vec3(0.0, 0.2, 0.5);

const int PALETTE_INDEX_PURPLE_GOLD = 0;
const int PALETTE_INDEX_YELLOW_GREEN = 1;
const int PALETTE_INDEX_ORANGE_BLUE = 2;

vec3 samplePalette(int paletteIndex, float t) {
    float clampedT = clamp(t, 0.0, 1.0);
    float idx = clamp(float(paletteIndex), 0.0, 2.0);

    vec3 purpleGoldColour = palette(clampedT, PALETTE_PURPLE_GOLD_A, PALETTE_PURPLE_GOLD_B, PALETTE_PURPLE_GOLD_C, PALETTE_PURPLE_GOLD_D);
    vec3 yellowGreenColour = palette(clampedT, PALETTE_YELLOW_GREEN_A, PALETTE_YELLOW_GREEN_B, PALETTE_YELLOW_GREEN_C, PALETTE_YELLOW_GREEN_D);
    vec3 orangeBlueColour = palette(clampedT, PALETTE_ORANGE_BLUE_A, PALETTE_ORANGE_BLUE_B, PALETTE_ORANGE_BLUE_C, PALETTE_ORANGE_BLUE_D);

    float usePalette1 = step(0.5, idx);
    float usePalette2 = step(1.5, idx);
    float usePalette0 = 1.0 - usePalette1;
    float isolatePalette1 = usePalette1 * (1.0 - usePalette2);
    float isolatePalette2 = usePalette2;

    return purpleGoldColour * usePalette0 +
        yellowGreenColour * isolatePalette1 +
        orangeBlueColour * isolatePalette2;
}

vec3 getColourFromPalette(float t) {
    return samplePalette(PALETTE_INDEX_YELLOW_GREEN, t);
}

vec3 getColourFromPalette(int paletteIndex, float t) {
    return samplePalette(paletteIndex, t);
}

#pragma glslify: export(getColourFromPalette)
