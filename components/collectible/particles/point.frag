// Answer Point Fragment Shader (optimized)
precision mediump float;

varying mediump float vProgress;
varying mediump float vOpacityFactor;
varying mediump float vSoftness;
varying lowp vec3 vColor;

void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float dist = length(c);
    float softEdge = mix(0.0, 0.45, vSoftness);
    float hardRadius = 0.5 - softEdge * 0.5;
    float circleMask = 1.0 - smoothstep(hardRadius, 0.5, dist);

    float appear = smoothstep(0.0, 0.15, vProgress);
    float settle = smoothstep(0.6, 1.0, vProgress);
    float trailFade = 1.0 - smoothstep(0.75, 1.0, vProgress);
    float linger = mix(trailFade, 1.0, settle);
    float opacity = appear * linger * circleMask;

    // Per-particle variation
    opacity *= vOpacityFactor;

    vec3 glowColor = mix(vColor, vec3(1.0, 1.0, 1.0), vSoftness);
    gl_FragColor = vec4(glowColor, opacity);
}
