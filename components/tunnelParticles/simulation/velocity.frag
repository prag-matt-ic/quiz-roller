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
    vec4 currentVel = texture2D(textureVelocity, uv);
    vec4 currentPos = texture2D(texturePosition, uv);
    
    vec3 velocity = currentVel.xyz;
    float life = currentPos.w;

    if (uIsIdle) { gl_FragColor = vec4(velocity, 1.0); return; }
    
    // If particle is dead or behind player, reset velocity
    if (life <= 0.0 || currentPos.z > 5.0) {
        // Initial velocity - primarily towards camera with some variation
        vec3 seed = vec3(uv * 100.0, uTime * 0.1);
        vec3 randomVel = noise3D(seed) * vec3(2.0, 2.0, 0.5); // Small XY variation, minimal Z variation
        
        velocity = vec3(randomVel.x, randomVel.y, 15.0 + randomVel.z * 5.0); // Base speed towards camera
    } else {
     
            // Add noise to velocity over time for organic movement
            vec3 noiseForce = noise3D(vec3(currentPos.xy * 0.1, uTime * 0.2)) * 3.0;
            
            // Apply forces
            // Compute a subtle force scale that keeps some motion even at speed 0
            float s = smoothstep(0.0, 0.6, clamp(uTerrainSpeed, 0.0, 1.0));
            float forceMul = mix(0.12, 1.0, s);
            velocity += noiseForce * uDeltaTime * forceMul;
            
            // Maintain forward momentum but allow some drift
            velocity.z = mix(velocity.z, 15.0, 0.02); // Slowly return to base forward speed
            
            // Add some damping to prevent excessive velocity buildup
            velocity *= 0.98;
        
    }
    
    gl_FragColor = vec4(velocity, 1.0);
}
