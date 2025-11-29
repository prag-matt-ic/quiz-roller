precision highp float;

#pragma glslify: fadeDistance = require('../../../../../resources/glsl/fadeDistance.glsl')

attribute vec3 aBarycentric;

uniform mediump float uDistanceFadeEnabled;
uniform mediump float uHiddenProgress;
uniform float uTime;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump float vCameraFade;
varying mediump float vHiddenOpacity;

void main() {
  vBarycentric = aBarycentric;
  
  float visibility = 1.0 - smoothstep(0.0, 1.0, uHiddenProgress);
  vHiddenOpacity = visibility;

  float angle = uTime * 0.3;
  float s = sin(angle);
  float c = cos(angle);
  mat3 rotationMatrix = mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );

  float scale = mix(0.33, 1.0, visibility);
  vec3 rotatedPosition = rotationMatrix * position;
  vec3 scaledPosition = rotatedPosition * scale;
  vec4 worldPosition = modelMatrix * vec4(scaledPosition, 1.0);

  if (uDistanceFadeEnabled < 0.5) {
    vCameraFade = 1.0;
  } else {
    vCameraFade = fadeDistance(worldPosition.z);
  }

  vec4 mvPosition = viewMatrix * worldPosition;
  vViewPosition = -mvPosition.xyz;
  
  vec3 rotatedNormal = rotationMatrix * normal;
  vNormal = normalize(normalMatrix * rotatedNormal);

  gl_Position = projectionMatrix * mvPosition;
}
