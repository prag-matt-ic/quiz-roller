// Answer Point Fragment Shader (optimized)
precision mediump float;

varying mediump float vProgress;
varying mediump float vOpacityFactor;
varying lowp vec3 vColor;

void main() {
    // Circular point mask without sqrt
    vec2 c = gl_PointCoord - vec2(0.5);
    float r2 = dot(c, c);
    float circleMask = 1.0 - step(0.25, r2); // 0.5^2

    // Temporal fade in/out
    float opacity = smoothstep(0.0, 0.1, vProgress) * (1.0 - smoothstep(0.8, 1.0, vProgress));
    opacity *= circleMask;

    // Per-particle variation
    opacity *= vOpacityFactor;

    gl_FragColor = vec4(vColor, opacity);
}
