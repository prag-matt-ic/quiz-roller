#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uTerrainSpeed; // 0..1 from gameplay
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
    
    // Compute a movement multiplier that still gives subtle motion at speed 0
    // Smoothly ramps up around low speeds for a natural feel.
    float s = smoothstep(0.0, 0.6, clamp(uTerrainSpeed, 0.0, 1.0));
    float moveMul = mix(0.12, 1.0, s); // 0.12 at rest, 1.0 at full speed
    
    // If particle is dead or behind player, respawn it
    if (life <= 0.0 || position.z > 5.0) {
        // Spawn inside a wide, short box above terrain (terrain at y=0)
        // Box extents: X in [-6, 6] (width ~12), Y in [0.5, 4.5] (height ~4), Z in [-60, -40]
        vec3 seed = vec3(uv * 123.0, uTime * 0.37);
        float rx = noise(seed + vec3(1.0, 0.0, 0.0));
        float ry = noise(seed + vec3(0.0, 1.0, 0.0));
        float rz = noise(seed + vec3(0.0, 0.0, 1.0));

        float x = mix(-6.0, 6.0, rx);
        float y = mix(0.5, 4.5, ry);
        float z = mix(-40.0, -30.0, rz);

        position = vec3(x, y, z);
        life = 1.0; // Reset life
    } else {
        // Always integrate with a multiplier so particles subtly move even when idle/at 0 speed
        position += velocity * uDeltaTime * moveMul;

        // Decrease life over time (slower decay = longer life), scale with movement
        life -= uDeltaTime * 0.1 * moveMul;
    }
    
    gl_FragColor = vec4(position, life);
}
