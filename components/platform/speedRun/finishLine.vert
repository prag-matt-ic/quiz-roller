// Finish line vertex shader (pass-through with UV forwarding)
#pragma glslify: fadeDistance = require('../../../resources/glsl/fadeDistance.glsl')

uniform mediump float uAspect; // width / height (kept for interface compatibility)
uniform mediump float uTilesX;
uniform mediump float uTilesY;
uniform mediump float uDistanceFadeEnabled;
varying mediump vec2 vUv;
varying mediump vec2 vTileCoord;
varying mediump float vDistanceFade;

void main() {
  vUv = uv;
  vTileCoord = uv * vec2(uTilesX, uTilesY);
  
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float fade = fadeDistance(worldPosition.z);
  vDistanceFade = mix(1.0, fade, uDistanceFadeEnabled);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
