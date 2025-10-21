// Answer Tile Particle Point Vertex Shader
#pragma glslify: noise3d = require('glsl-noise/simplex/3d')

uniform float uBurstProgress; // 0.0 to 1.0
uniform vec3 uPlayerPosition;
uniform float uDpr;
uniform float uShouldAttract; // 0.0 or 1.0

attribute vec3 spawnPosition;
attribute float seed;

varying float vProgress;
varying float vSeed;

const float ATTRACTION_START = 0.6;
const float MIN_ATTRACT_PULL = 0.24;
const float PI_2 = 6.28318530718;

void main() {
    float timingOffset = seed * 0.2;

    float normalizer = max(1.0 - timingOffset, 0.0001);
    float progress = clamp((uBurstProgress - timingOffset) / normalizer, 0.0, 1.0);

    float attractionPhase = clamp((progress - ATTRACTION_START) / max(1.0 - ATTRACTION_START, 0.0001), 0.0, 1.0);
    float pull = mix(0.0, 1.0, attractionPhase);
    float effectivePull = uShouldAttract * mix(MIN_ATTRACT_PULL, 1.0, pull);

    float lateralAngle = fract(seed * 17.0) * PI_2;
    float lateralStrength = mix(0.2, 0.8, fract(seed * 27.0));
    float upwardStrength = mix(2.5, 6.0, fract(seed * 15.0));
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
    vec3 noiseOffset = vec3(noiseX * 0.2, noiseY * 0.4, noiseZ * 0.2);
    noiseOffset *= (1.0 - attractionPhase);

    vec3 burstPosition = spawnPosition + burstOffset + noiseOffset;
    vec3 finalPosition = mix(burstPosition, uPlayerPosition, effectivePull);

    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    float baseSize = mix(4.0, 12.0, seed);
    float sizeFade = 1.0 - attractionPhase * 0.4;
    gl_PointSize = baseSize * sizeFade * uDpr;

    vProgress = progress;
    vSeed = seed;
}
