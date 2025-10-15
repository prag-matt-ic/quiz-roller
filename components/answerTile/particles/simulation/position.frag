#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uDeltaTime;
uniform bool uIsIdle;
uniform bool uSpawnBurst; // one-frame trigger to emit
uniform float uTileWidth;
uniform float uTileHeight;
uniform float uSpawnY; // local Y for plane surface
uniform vec3 uParentDeltaLocal; // parent world delta transformed into emitter local

const float LIFE_DECAY = 0.45; // Lifetime decay (seconds): ~2.2s total
const float HALF_RANGE = 0.5;
const vec2 TILE_NOISE_SCALE = vec2(127.13, 91.73);
const vec2 TILE_NOISE_TIME_SCALE = vec2(0.37, 0.21);
const float TILE_NOISE_Z_OFFSET = 10.0;

void main() {
    vec2 textureUV = gl_FragCoord.xy / resolution.xy;
    vec4 sampledPosition = texture2D(texturePosition, textureUV);
    vec4 sampledVelocity = texture2D(textureVelocity, textureUV);

    vec3 position = sampledPosition.xyz;
    vec3 velocity = sampledVelocity.xyz;
    float life = sampledPosition.w;

    // Remain completely static while idle unless a spawn was requested
    if (uIsIdle && !uSpawnBurst) {
        gl_FragColor = vec4(position, life);
        return;
    }

    // Emit from the AnswerTile plane when triggered and particle is dead
    if (uSpawnBurst && life <= 0.0) {
        // Randoms in [-1,1]
        float noiseSampleX = noise(vec3(textureUV * TILE_NOISE_SCALE.x, uTime * TILE_NOISE_TIME_SCALE.x));
        float noiseSampleZ = noise(vec3(textureUV * TILE_NOISE_SCALE.y + TILE_NOISE_Z_OFFSET, uTime * TILE_NOISE_TIME_SCALE.y));

        // Map to tile surface in local space
        float spawnX = noiseSampleX * HALF_RANGE * uTileWidth;  // [-0.5..0.5] * width
        float spawnZ = noiseSampleZ * HALF_RANGE * uTileHeight; // [-0.5..0.5] * height

        position = vec3(spawnX, uSpawnY, spawnZ);
        life = 1.0; // start fully alive; fragment shader handles fade-in/out
    } else if (life > 0.0) {
        // Integrate
        position += velocity * uDeltaTime;
        // Cancel out parent translation so particles remain in world space
        position -= uParentDeltaLocal;
        life = max(0.0, life - LIFE_DECAY * uDeltaTime);
    }

    gl_FragColor = vec4(position, life);
}
