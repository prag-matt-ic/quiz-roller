// Collectible Particle Point Vertex Shader (gem focused)
#pragma glslify: noise3d = require('glsl-noise/simplex/3d')

precision highp float;

uniform float uBurstProgress; // 0.0 to 1.0
uniform vec3 uGemPosition;
uniform float uGemScale;
uniform float uTime;
uniform float uDpr;

attribute vec3 spawnPosition;
attribute vec3 gemTarget;
attribute float seed;
attribute vec3 colour;

varying mediump float vProgress;
varying mediump float vOpacityFactor;
varying mediump float vSoftness;
varying lowp vec3 vColor;

const float TWO_PI = 6.28318530718;
const float EPSILON = 0.0001;
const vec3 NOISE_WEIGHTS = vec3(0.7, 0.4, 0.5);
const vec3 FLOAT_FREQ = vec3(0.35, 0.27, 0.41);
const float GEM_INTERIOR_SCALE = 0.9;
const float OCTA_INV_SQRT3 = 0.57735027;

float easeOutCubic(in float t) {
    float inverted = 1.0 - t;
    return 1.0 - inverted * inverted * inverted;
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * OCTA_INV_SQRT3;
}

vec3 clampToOctahedron(vec3 p, float s) {
    vec3 absP = abs(p);
    float sum = absP.x + absP.y + absP.z;
    if (sum <= s) return p;
    float scale = s / max(sum, EPSILON);
    return p * scale;
}

void main() {
    float timingOffset = seed * 0.2;
    float normalizer = max(1.0 - timingOffset, EPSILON);
    float progress = clamp((uBurstProgress - timingOffset) * (1.0 / normalizer), 0.0, 1.0);
    float easedProgress = easeOutCubic(progress);
    float settleProgress = smoothstep(0.5, 1.0, progress);
    float inverseProgress = 1.0 - progress;

    vec4 hashedSeed = fract(seed * vec4(17.0, 27.0, 15.0, 13.0));

    vec3 baseNoise = vec3(
        noise3d(vec3(seed * 6.0, progress * 0.6, 0.0)),
        noise3d(vec3(seed * 4.0, progress * 0.4, 2.3)),
        noise3d(vec3(seed * 5.0, progress * 0.5, 3.9))
    );
    vec3 swirlNoise = baseNoise * NOISE_WEIGHTS * inverseProgress;

    vec3 gemInterior = gemTarget * (uGemScale * GEM_INTERIOR_SCALE);
    vec3 gemTargetPosition = uGemPosition + gemInterior;

    vec3 liftPosition = mix(spawnPosition, gemTargetPosition, easedProgress);
    float arcHeight = mix(0.5, 1.4, hashedSeed.w) * max(uGemScale * 10.0, 0.5);
    float arcProfile = progress * (1.0 - progress);
    liftPosition.y += arcHeight * arcProfile;
    liftPosition += swirlNoise;

    float timePhase = uTime * 0.4;
    vec3 floatWave = vec3(
        sin(timePhase * FLOAT_FREQ.x + seed * TWO_PI),
        sin(timePhase * FLOAT_FREQ.y + seed * 13.0),
        cos(timePhase * FLOAT_FREQ.z + seed * 7.0)
    );
    floatWave *= uGemScale * mix(0.2, 0.5, hashedSeed.y);
    float interiorBound = uGemScale * GEM_INTERIOR_SCALE;
    vec3 floatingLocal = gemInterior + floatWave;
    float octaDistance = sdOctahedron(floatingLocal, interiorBound);
    if (octaDistance > 0.0) {
        floatingLocal = clampToOctahedron(floatingLocal, interiorBound);
    }
    vec3 floatingPosition = uGemPosition + floatingLocal;

    vec3 finalPosition = mix(liftPosition, floatingPosition, settleProgress);

    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    float baseSize = mix(8.0, 14.0, fract(seed * 17.0));
    float sizeFade = 1.0 - easedProgress * 0.3;
    gl_PointSize = baseSize * sizeFade * uDpr;

    vProgress = progress;
    vOpacityFactor = 1.0 - seed * 0.5;
    vSoftness = fract(seed * 31.0);
    vColor = colour;
}
