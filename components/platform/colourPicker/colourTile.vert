precision highp float;
precision highp int;

#pragma glslify: fadeDistance = require('../../../resources/glsl/fadeDistance.glsl')

uniform mediump float uDistanceFadeEnabled;

varying mediump vec2 vUv;
varying mediump float vDistanceFade;

void main() {
  vUv = uv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float fade = fadeDistance(worldPosition.z);
  vDistanceFade = mix(1.0, fade, uDistanceFadeEnabled);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
