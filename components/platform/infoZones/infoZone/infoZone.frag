// InfoZone border fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: paintCorners = require(../../../../resources/glsl/paintCorners.glsl)

uniform mediump float uAspect; // width / height
uniform mediump float uOpacity;
uniform mediump float uTilesX;
uniform mediump float uTilesY;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_THICKNESS_TILES = 0.1; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner

void main() {
  float bracketMask = paintCorners(
    vHeightSpacePosition,
    uAspect,
    vec2(uTilesX, uTilesY),
    BORDER_THICKNESS_TILES,
    CORNER_LENGTH_TILES
  );

  vec4 color = vec4(1.0, 1.0, 1.0, uOpacity * bracketMask);
  gl_FragColor = color;
}
