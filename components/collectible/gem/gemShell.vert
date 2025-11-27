precision highp float;

#pragma glslify: fadeDistance = require('../../../resources/glsl/fadeDistance.glsl')

attribute vec3 aBarycentric;

uniform mediump float uConfirmingProgress;
uniform highp float uTime;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump vec3 vPosition;
varying mediump float vPulse;
varying mediump float vPulseMix;
varying mediump float vRevealLimit;
varying mediump float vCameraFade;

void main() {
  mediump float clampedProgress = clamp(uConfirmingProgress, 0.0, 1.0);

  vBarycentric = aBarycentric;
  vPosition = position; // Pass local position for reveal effect
  vPulse = 0.5 + 0.5 * sin(uTime * 4.0);
  vPulseMix = smoothstep(0.9, 1.0, clampedProgress);
  vRevealLimit = clampedProgress * 3.5 - 1.75;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  #ifdef USE_DISTANCE_FADE
    vCameraFade = fadeDistance(worldPosition.z);
  #else
    vCameraFade = 1.0;
  #endif

  vec4 mvPosition = viewMatrix * worldPosition;
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
