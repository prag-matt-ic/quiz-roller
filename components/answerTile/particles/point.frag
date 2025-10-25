// Answer Point Fragment Shader
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

precision mediump float;

varying mediump float vProgress;
varying mediump float vSeed;

void main() {
    vec2 centeredCoord = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centeredCoord);

    float fadeIn = smoothstep(0.0, 0.1, vProgress);
    float fadeOut = 1.0 - smoothstep(0.85, 1.0, vProgress);
    float opacity = fadeIn * fadeOut;

    float circleMask = 1.0 - smoothstep(0.48, 0.5, distanceFromCenter);
    opacity *= circleMask;

    vec3 colour = getColourFromPalette(fract(vSeed * 7.0));

    float opacityMultiplier = 1.0 - vSeed * 0.5;
    opacity *= opacityMultiplier;

    gl_FragColor = vec4(colour, opacity);
}
