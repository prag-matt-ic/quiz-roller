// AnswerTile vertex shader (pass-through)
uniform mediump float uTileAspect;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

void main() {
  vUv = uv;

  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uTileAspect;
  vHeightSpacePosition = centeredUv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
