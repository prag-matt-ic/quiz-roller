// Answer Point Fragment Shader
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

varying float vProgress;
varying float vSeed;

void main() {
    // Circular point sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    float d = length(coord);
    if (d > 0.5) discard;

    float fadeIn = smoothstep(0.0, 0.1, vProgress);
    float fadeOut = smoothstep(1.0, 0.85, vProgress);
    float opacity = fadeIn * fadeOut;

    vec3 colour = getColourFromPalette(fract(vSeed * 7.0));

    float opacityMultiplier = 1.0 - vSeed * 0.5;
    opacity *= opacityMultiplier;

    gl_FragColor = vec4(colour, opacity);
}
