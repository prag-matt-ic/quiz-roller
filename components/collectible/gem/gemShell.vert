precision highp float;

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

void main() {
  mediump float clampedProgress = clamp(uConfirmingProgress, 0.0, 1.0);

  vBarycentric = aBarycentric;
  vPosition = position; // Pass local position for reveal effect
  vPulse = 0.5 + 0.5 * sin(uTime * 4.0);
  vPulseMix = smoothstep(0.9, 1.0, clampedProgress);
  vRevealLimit = clampedProgress * 3.5 - 1.75;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}

