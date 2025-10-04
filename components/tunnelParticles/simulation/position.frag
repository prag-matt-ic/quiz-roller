#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uTimeMultiplier;
uniform float uDeltaTime;
uniform bool uIsIdle;


// 3D noise helper that returns a vec3
vec3 noise3D(vec3 p) {
    return vec3(
        noise(p),
        noise(p + vec3(123.45, 67.89, 0.0)),
        noise(p + vec3(0.0, 123.45, 67.89))
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 currentPos = texture2D(texturePosition, uv);
    vec4 currentVel = texture2D(textureVelocity, uv);
    
    vec3 position = currentPos.xyz;
    vec3 velocity = currentVel.xyz;
    float life = currentPos.w;
    
    // If particle is dead or behind player, respawn it
    if (life <= 0.0 || position.z > 5.0) {
        // Generate new random position within tunnel radius (6.4 meters)
        vec3 seed = vec3(uv * 100.0, uTime);
        float angle = noise(seed + vec3(1.0, 0.0, 0.0)) * 6.28318; // 2*PI
        float radius = noise(seed + vec3(0.0, 1.0, 0.0)) * 6.0; // Within tunnel radius
        
        position = vec3(
            cos(angle) * radius,
            sin(angle) * radius,
            -40.0 - noise(seed + vec3(0.0, 0.0, 1.0)) * 20.0 // Spawn around -40 to -60
        );
        life = 1.0; // Reset life
    } else {
        if (!uIsIdle) {
            // Use velocity for movement
            position += velocity * uDeltaTime * uTimeMultiplier;
        }
        
        // Decrease life over time (slower decay = longer life)
        life -= uDeltaTime * 0.1 * uTimeMultiplier;
    }
    
    gl_FragColor = vec4(position, life);
}
