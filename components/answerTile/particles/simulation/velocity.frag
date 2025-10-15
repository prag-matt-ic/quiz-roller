#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uDeltaTime;
uniform bool uIsIdle;
uniform bool uSpawnBurst; // one-frame trigger to emit
uniform vec3 uPlayerPos;  // player position in the emitter's local space

// Physics constants
const float GRAVITY = -14.0;           // slightly reduced gravity
const float DRAG = 0.985;              // gentle air drag
const float ATTRACTION_MAX = 22.0;     // max attraction accel (units/s^2)
const float ATTRACTION_RADIUS = 10.0;  // distance where attraction reaches max
const float MIN_ATTRACTION_DISTANCE = 0.0001; // minimum distance to avoid division by zero

// Spawn burst constants
const float LATERAL_SCATTER = 3.0;     // horizontal velocity spread
const float BASE_VERTICAL_VEL = 14.0;  // minimum upward velocity
const float VERTICAL_VEL_RANGE = 7.0;  // additional upward velocity variation

// Noise sampling constants
const float NOISE_SPATIAL_SCALE = 77.0;
const float NOISE_TEMPORAL_SCALE = 0.13;

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

    // Remain static while idle unless we are spawning now
    if (uIsIdle && !uSpawnBurst) { gl_FragColor = vec4(velocity, 1.0); return; }

    // Initialize upward burst when triggered and currently dead
    if (uSpawnBurst && life <= 0.0) {
        vec3 noiseSample = noise3D(vec3(uv * NOISE_SPATIAL_SCALE, uTime * NOISE_TEMPORAL_SCALE)); // [-1,1]^3
        vec2 lateralNoise = noiseSample.xz;
        float verticalSpeed = BASE_VERTICAL_VEL + abs(noiseSample.y) * VERTICAL_VEL_RANGE;
        velocity = vec3(lateralNoise.x * LATERAL_SCATTER, verticalSpeed, lateralNoise.y * LATERAL_SCATTER);
    } else if (life > 0.0) {
        // Gravity + drag while alive
        velocity.y += GRAVITY * uDeltaTime;
        velocity *= DRAG;

        // Attraction towards player with ease-in over lifetime
        vec3 toPlayer = uPlayerPos - currentPos.xyz;
        float distanceToPlayer = length(toPlayer);
        if (distanceToPlayer > MIN_ATTRACTION_DISTANCE) {
            vec3 directionToPlayer = toPlayer / distanceToPlayer;
            // Stronger when far; modulated by age-based ease-in
            float attractionRatio = clamp(distanceToPlayer / ATTRACTION_RADIUS, 0.0, 1.0);
            float age = 1.0 - life;            // 0 at spawn -> 1 near end of life
            float easeIn = age * age;          // quadratic ease-in
            float attractionAcceleration = ATTRACTION_MAX * attractionRatio * easeIn;
            velocity += directionToPlayer * (attractionAcceleration * uDeltaTime);
        }
    } else {
        // Remain at rest once dead
        velocity *= 0.0;
    }

    gl_FragColor = vec4(velocity, 1.0);
}
