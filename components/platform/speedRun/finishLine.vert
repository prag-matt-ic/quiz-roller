// Finish line vertex shader (pass-through with UV forwarding)
uniform mediump float uAspect; // width / height (kept for interface compatibility)
uniform mediump float uTilesX;
uniform mediump float uTilesY;
varying mediump vec2 vUv;
varying mediump vec2 vTileCoord;

void main() {
  vUv = uv;
  vTileCoord = uv * vec2(uTilesX, uTilesY);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
