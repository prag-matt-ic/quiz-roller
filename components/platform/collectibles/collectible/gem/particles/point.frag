// Answer Point Fragment Shader (optimized)
precision mediump float;

varying lowp vec4 vColorAlpha; // rgb = color, a = opacity
varying mediump float vSoftness;

void main() {
    // Circle shape calculation
    vec2 c = gl_PointCoord - vec2(0.5);
    float dist = length(c);
    
    // Soft edge calculation
    float circleMask;
    
    if (vSoftness > 1.5) {
        // Sparkle mode: Pow2 falloff for "glowing star" look
        // dist is 0..0.5, so dist*2 is 0..1
        float falloff = max(0.0, 1.0 - dist * 2.0);
        circleMask = falloff * falloff;
    } else {
        // Standard particle mode
        float softEdge = mix(0.0, 0.45, vSoftness);
        float hardRadius = 0.5 - softEdge * 0.5;
        circleMask = 1.0 - smoothstep(hardRadius, 0.5, dist);
    }

    // Final opacity: combined vertex opacity * shape mask
    float finalOpacity = vColorAlpha.a * circleMask;

    // Discard fully transparent pixels to save fill rate (optional but good for overdraw)
    if (finalOpacity < 0.01) discard;

    gl_FragColor = vec4(vColorAlpha.rgb, finalOpacity);
}
