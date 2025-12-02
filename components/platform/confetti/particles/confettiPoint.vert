precision highp float;

#pragma glslify: fadeDistance = require('../../../../resources/glsl/fadeDistance.glsl')

uniform float uBurstProgress;
uniform float uTime;
uniform float uDpr;
uniform float uGravity;
uniform float uBurstDuration;

attribute vec3 spawnPosition;
attribute vec3 driftVelocity;
attribute float launchSpeed;
attribute float seed;
attribute vec3 colour;

varying vec4 vColorAlpha;

float easeOutCubic(in float t) {
  float inv = 1.0 - t;
  return 1.0 - inv * inv * inv;
}

float easeOutQuint(in float t) {
  float inv = 1.0 - t;
  return 1.0 - inv * inv * inv * inv * inv;
}

void main() {
  float progress = clamp(uBurstProgress, 0.0, 1.0);
  float eased = easeOutQuint(progress);
  float settle = smoothstep(0.6, 1.0, progress);
  float inverse = 1.0 - progress;
  float burstTime = progress * uBurstDuration;

  float timePhase = uTime * 0.9;
  vec3 wobble = vec3(
    sin(timePhase * 0.8 + seed * 6.0),
    sin(timePhase * 0.6 + seed * 9.0),
    cos(timePhase * 0.7 + seed * 5.0)
  ) * inverse * 0.2;

  vec3 drift = driftVelocity * burstTime;
  float vertical = launchSpeed * burstTime + 0.5 * uGravity * burstTime * burstTime;
  vec3 pos = spawnPosition + drift + vec3(0.0, vertical, 0.0) + wobble;

  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  #ifdef USE_DISTANCE_FADE
    float distanceFade = fadeDistance(modelPosition.z);
  #else
    float distanceFade = 1.0;
  #endif

  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  float baseSize = mix(16.0, 42.0, seed);
  float perspectiveScale = projectionMatrix[1][1];
  float distanceToCamera = max(-viewPosition.z, 0.1);
  float attenuation = clamp(perspectiveScale / distanceToCamera, 0.25, 2.6);

  gl_PointSize = baseSize * attenuation * uDpr * distanceFade;

  float appear = smoothstep(0.0, 0.12, progress);
  float fade = 1.0 - smoothstep(0.75, 1.0, progress);
  float opacity = appear * fade * mix(0.85, 1.15, seed) * distanceFade;

  vColorAlpha = vec4(colour, opacity * mix(1.0, 1.2, settle));
}
