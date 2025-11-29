// InfoZone border vertex shader (pass-through with height-space coords)
#pragma glslify: fadeDistance = require('../../../../resources/glsl/fadeDistance.glsl')

uniform mediump float uAspect; // width / height
uniform mediump float uDistanceFadeEnabled;

varying mediump vec2 vHeightSpacePosition;
varying mediump float vDistanceFade;

void main() {
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uAspect;
  vHeightSpacePosition = centeredUv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float fade = fadeDistance(worldPosition.z);
  vDistanceFade = mix(1.0, fade, uDistanceFadeEnabled);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
