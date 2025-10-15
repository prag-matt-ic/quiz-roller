uniform float uTime;

varying float vLife;
varying float vSeed;

void main() {
    // Circular point sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    float d = length(coord);
    if (d > 0.5) discard;

    float falloff = 1.0 - d * 2.0; // 0..1
    falloff = pow(falloff, 1.5);

    // Debug: solid black, strong alpha independent of life
    vec3 color = vec3(0.0);
    float alpha = falloff;

    gl_FragColor = vec4(color, alpha);
}
