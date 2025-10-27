// InfoZone border vertex shader (pass-through with height-space coords)
uniform mediump float uAspect; // width / height

varying mediump vec2 vHeightSpacePosition;

void main() {
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uAspect;
  vHeightSpacePosition = centeredUv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
