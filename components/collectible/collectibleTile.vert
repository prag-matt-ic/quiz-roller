// AnswerTile vertex shader (pass-through)
precision mediump float;
precision mediump int;

uniform mediump float uAspect; // matches fragment shader expectation

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

void main() {
  vUv = uv;

  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uAspect;
  vHeightSpacePosition = centeredUv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
