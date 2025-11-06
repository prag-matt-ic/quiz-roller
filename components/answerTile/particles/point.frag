// Answer Point Fragment Shader
precision mediump float;

varying mediump float vProgress;
varying mediump float vSeed;
varying mediump vec3 vCorrectColour;
varying mediump vec3 vWrongColour;

uniform float uWasCorrect;

void main() {
    vec2 centeredCoord = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centeredCoord);

    float fadeIn = smoothstep(0.0, 0.1, vProgress);
    float fadeOut = 1.0 - smoothstep(0.8, 1.0, vProgress);
    float opacity = fadeIn * fadeOut;

    float circleMask = 1.0 - step(0.5, distanceFromCenter);
    opacity *= circleMask;

    float colourMix = clamp(uWasCorrect, 0.0, 1.0);
    vec3 colour = mix(vWrongColour, vCorrectColour, colourMix);

    float opacityMultiplier = 1.0 - vSeed * 0.5;
    opacity *= opacityMultiplier;

    gl_FragColor = vec4(colour, opacity);
}
