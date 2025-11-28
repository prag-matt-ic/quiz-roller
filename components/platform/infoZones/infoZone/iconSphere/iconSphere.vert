precision highp float;

#pragma glslify: fadeDistance = require('../../../../../resources/glsl/fadeDistance.glsl')

attribute vec3 aBarycentric;

uniform mediump float uDistanceFadeEnabled;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump float vCameraFade;

void main() {
  vBarycentric = aBarycentric;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  if (uDistanceFadeEnabled < 0.5) {
    vCameraFade = 1.0;
  } else {
    vCameraFade = fadeDistance(worldPosition.z);
  }

  vec4 mvPosition = viewMatrix * worldPosition;
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
