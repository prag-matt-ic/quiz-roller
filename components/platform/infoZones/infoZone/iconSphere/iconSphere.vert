precision highp float;

#pragma glslify: fadeDistance = require('../../../../../resources/glsl/fadeDistance.glsl')

attribute vec3 aBarycentric;

uniform mediump float uDistanceFadeEnabled;
uniform mediump float uHiddenProgress;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump float vCameraFade;
varying mediump float vHiddenOpacity;

void main() {
  vBarycentric = aBarycentric;
  
  float visibility = 1.0 - smoothstep(0.0, 1.0, uHiddenProgress);
  vHiddenOpacity = visibility;

  float scale = mix(0.33, 1.0, visibility);
  vec3 scaledPosition = position * scale;
  vec4 worldPosition = modelMatrix * vec4(scaledPosition, 1.0);

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
