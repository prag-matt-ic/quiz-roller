// Tunnel Particles Point Fragment Shader
uniform float uTime;

varying float vLife;
varying float vSeed;

void main() {
    // Create circular point
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distance = length(coord);
    
    if (distance > 0.5) {
        discard;
    }
    
    // Create star-like falloff using pow2 for sharper edges
    float falloff = 1.0 - distance * 2.0; // Normalize to 0-1
    falloff = pow(falloff, 2.0); // Apply power of 2 for sharper falloff
    
    // Combine with life for final alpha
    float alpha = falloff * vLife * 0.9;
    
    // Color variation based on seed
    vec3 baseColor = vec3(0.0, 1.0, 0.8); // Teal
    vec3 color = mix(baseColor, vec3(0.0, 0.8, 1.0), vSeed);
    
    // Add bright core using pow2 for star-like intensity
    float core = pow(falloff, 4.0); // Even sharper for the bright center
    color += core * 0.5;
    
    gl_FragColor = vec4(color, alpha);
}
