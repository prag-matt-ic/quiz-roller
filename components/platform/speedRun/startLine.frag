// Speed Run Start Line Fragment Shader
precision mediump float;
precision mediump int;

uniform mediump float uAspect; // width / height (kept for interface compatibility)
uniform mediump float uOpacity;
uniform mediump float uTilesX;
uniform mediump float uTilesY;
varying mediump vec2 vUv;
varying mediump vec2 vTileCoord;
varying mediump float vDistanceFade;

void main() {
  const mediump float TILE_EPS = 1e-4;
  const mediump float STRIPE_RATIO = 0.08;

  mediump vec2 tileFloor = floor(vTileCoord + TILE_EPS);
  mediump float checkerPhase = fract(0.5 * (tileFloor.x + tileFloor.y));
  mediump float lightMask = step(0.25, checkerPhase);

  mediump vec3 baseColor = mix(vec3(0.05, 0.14, 0.18), vec3(0.09, 0.26, 0.32), lightMask);
  mediump float alpha = uOpacity;

  mediump float stripeMask = 1.0 - step(STRIPE_RATIO, vUv.y);
  baseColor = mix(baseColor, vec3(0.18, 0.86, 0.62), stripeMask);
  alpha = mix(alpha, uOpacity, stripeMask);

  gl_FragColor = vec4(baseColor, alpha * vDistanceFade);
}
