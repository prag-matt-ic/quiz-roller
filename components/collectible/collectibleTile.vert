// AnswerTile vertex shader (pass-through)
#pragma glslify: fadeDistance = require('../../resources/glsl/fadeDistance.glsl')

precision mediump float;
precision mediump int;

uniform mediump float uAspect; // matches fragment shader expectation
uniform mediump float uUseDistanceFade;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;
varying mediump float vDistanceFade;

void main() {
  vUv = uv;

  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uAspect;
  vHeightSpacePosition = centeredUv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;

  if (uUseDistanceFade > 0.5) {
    vDistanceFade = fadeDistance(worldPosition.z);
  } else {
    vDistanceFade = 1.0;
  }

  gl_Position = projectionMatrix * viewPosition;
}
