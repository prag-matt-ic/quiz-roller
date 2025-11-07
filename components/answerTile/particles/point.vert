// Answer Tile Particle Point Vertex Shader (optimized)
#pragma glslify: noise3d = require('glsl-noise/simplex/3d')

precision highp float;

uniform float uBurstProgress; // 0.0 to 1.0
uniform vec3 uPlayerPosition;
uniform float uDpr;
uniform float uWasCorrect; // 0.0 or 1.0

attribute vec3 spawnPosition;
attribute float seed;
attribute vec3 correctColour;
attribute vec3 wrongColour;

varying mediump float vProgress;
varying mediump float vOpacityFactor;
varying lowp vec3 vColor;

const float TWO_PI = 6.28318530718;
const float EPSILON = 0.0001;
const vec3 NOISE_WEIGHTS = vec3(0.8, 0.3, 0.4);

float easeOutCubic(in float t) {
    float inverted = 1.0 - t;
    return 1.0 - inverted * inverted * inverted;
}

void main() {
    // Progress with per-particle offset; avoid division via reciprocal
    float timingOffset = seed * 0.2;
    float normalizer = max(1.0 - timingOffset, EPSILON);
    float progress = clamp((uBurstProgress - timingOffset) * (1.0 / normalizer), 0.0, 1.0);
    float oneMinusProgress = 1.0 - progress;
    float easedProgress = easeOutCubic(progress);
    float easedInverse = 1.0 - easedProgress;

    // Hash seed for deterministic params
    vec4 hashedSeed = fract(seed * vec4(17.0, 27.0, 15.0, 13.0));
    float lateralAngle = hashedSeed.x * TWO_PI;
    float lateralStrength = mix(0.2, 0.8, hashedSeed.y);
    float upwardStrength = mix(4.0, 8.4, hashedSeed.z);

    // Outward burst vector
    vec3 burstVector = vec3(
        cos(lateralAngle) * lateralStrength,
        upwardStrength,
        sin(lateralAngle) * lateralStrength
    );
    vec3 burstOffset = burstVector * progress;

    // Coherent noise (share intermediates)
    float noisePhase = seed * 6.0;
    float t06 = progress * 0.6;
    float t03 = progress * 0.3;
    float noiseX = noise3d(vec3(noisePhase, t06, 0.0));
    float noiseY = fract(seed * 23.0); //noise3d(vec3(noisePhase, t03, 2.4));
    float noiseZ = noise3d(vec3(noisePhase, t06, 3.0));
    vec3 baseNoise = vec3(noiseX, noiseY, noiseZ);
    vec3 burstNoise = baseNoise * NOISE_WEIGHTS * oneMinusProgress;
    vec3 burstPosition = spawnPosition + burstOffset + burstNoise;

    // Attraction towards player
    vec3 toPlayer = uPlayerPosition - spawnPosition;
    vec3 attractionPosition = spawnPosition + toPlayer * progress;

    float verticalBase = mix(spawnPosition.y, uPlayerPosition.y, easedProgress);
    attractionPosition.y = verticalBase;

    float arcHeight = mix(5.0, 9.0, hashedSeed.w);
    float heightProfile = pow(progress, 0.4) * oneMinusProgress;
    attractionPosition.y += arcHeight * heightProfile;

    vec3 attractionNoise = baseNoise * NOISE_WEIGHTS * easedInverse;
    attractionNoise.y *= 0.6;
    attractionPosition += attractionNoise;

    float attractStrength = clamp(uWasCorrect, 0.0, step(0.3, seed)); // 70% chance to attract if correct
    vec3 finalPosition = mix(burstPosition, attractionPosition, attractStrength);

    // Standard transform
    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Point size with subtle shrink during motion
    float baseSize = mix(12.0, 24.0, fract(seed * 17.0));
    float sizeFade = 1.0 - easedProgress * 0.3;
    gl_PointSize = baseSize * sizeFade * uDpr;

    // Varyings
    vProgress = progress;
    vOpacityFactor = 1.0 - seed * 0.5;
    vColor = mix(wrongColour, correctColour, clamp(uWasCorrect, 0.0, 1.0));
}
