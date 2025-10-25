// Answer Tile Particle Point Vertex Shader
#pragma glslify: noise3d = require('glsl-noise/simplex/3d')

uniform float uBurstProgress; // 0.0 to 1.0
uniform vec3 uPlayerPosition;
uniform float uDpr;
uniform float uShouldAttract; // 0.0 or 1.0

attribute vec3 spawnPosition;
attribute float seed;

varying mediump float vProgress;
varying mediump float vSeed;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float EPSILON = 0.0001;
const vec3 NOISE_WEIGHTS = vec3(0.18, 0.35, 0.18);

float easeOutCubic(float t) {
    float inverted = 1.0 - t;
    return 1.0 - inverted * inverted * inverted;
}

void main() {
    float timingOffset = seed * 0.2;
    float normalizer = max(1.0 - timingOffset, EPSILON);
    float progress = clamp((uBurstProgress - timingOffset) / normalizer, 0.0, 1.0);
    float oneMinusProgress = 1.0 - progress;
    float easedProgress = easeOutCubic(progress);
    float easedInverse = 1.0 - easedProgress;

    vec4 hashedSeed = fract(seed * vec4(17.0, 27.0, 15.0, 13.0));
    float lateralAngle = hashedSeed.x * TWO_PI;
    float lateralStrength = mix(0.2, 0.8, hashedSeed.y);
    float upwardStrength = mix(2.5, 6.0, hashedSeed.z);
    vec3 burstVector = vec3(
        cos(lateralAngle) * lateralStrength,
        upwardStrength,
        sin(lateralAngle) * lateralStrength
    );
    vec3 burstOffset = burstVector * progress;

    float noisePhase = seed * 6.0;
    float noiseX = noise3d(vec3(noisePhase, progress * 0.6, 0.0));
    float noiseY = noise3d(vec3(noisePhase, progress * 0.3, 2.4));
    float noiseZ = noise3d(vec3(noisePhase, progress * 0.6, 3.0));
    vec3 baseNoise = vec3(noiseX, noiseY, noiseZ);
    vec3 burstNoise = baseNoise * NOISE_WEIGHTS * oneMinusProgress;
    vec3 burstPosition = spawnPosition + burstOffset + burstNoise;

    vec3 toPlayer = uPlayerPosition - spawnPosition;
    vec3 attractionPosition = spawnPosition + toPlayer * progress;

    float verticalBase = mix(spawnPosition.y, uPlayerPosition.y, easedProgress);
    attractionPosition.y = verticalBase;

    float arcHeight = mix(3.0, 6.5, hashedSeed.w);
    float heightProfile = pow(progress, 0.35) * oneMinusProgress;
    attractionPosition.y += arcHeight * heightProfile;

    vec3 attractionNoise = baseNoise * NOISE_WEIGHTS * easedInverse;
    attractionNoise.y *= 0.6;
    attractionPosition += attractionNoise;

    float attractStrength = clamp(uShouldAttract, 0.0, 1.0);
    vec3 finalPosition = mix(burstPosition, attractionPosition, attractStrength);

    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    float baseSize = mix(8.0, 20.0, seed);
    float sizeFade = 1.0 - easedProgress * 0.4;
    gl_PointSize = baseSize * sizeFade * uDpr;

    vProgress = progress;
    vSeed = seed;
}
