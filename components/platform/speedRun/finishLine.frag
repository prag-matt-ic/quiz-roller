// Finish Line Fragment Shader
precision mediump float;
precision mediump int;

uniform mediump float uAspect; // width / height
uniform mediump float uOpacity;
uniform mediump float uTilesX;
uniform mediump float uTilesY;
varying mediump vec2 vUv;
varying mediump vec2 vTileCoord;


void main() {
  const mediump float TILE_EPS = 1e-4;
  const mediump float RED_LINE_RATIO = 0.05;

  mediump vec2 tileFloor = floor(vTileCoord + TILE_EPS);
  mediump float checkerPhase = fract(0.5 * (tileFloor.x + tileFloor.y));
  mediump float blackMask = 1.0 - step(0.25, checkerPhase); // 1.0 for even tiles

  lowp vec3 color = vec3(0.0);
  mediump float alpha = uOpacity * blackMask;

  mediump float redLineMask = 1.0 - step(RED_LINE_RATIO, vUv.y);
  color = mix(color, vec3(0.75, 0.0, 0.0), redLineMask);
  alpha = mix(alpha, uOpacity, redLineMask);

  gl_FragColor = vec4(color, alpha);
}
