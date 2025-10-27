// InfoZone border fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: sdBox = require(../sdBox.glsl)

uniform mediump float uAspect; // width / height
uniform mediump float uOpacity;
uniform mediump float uTilesX;
uniform mediump float uTilesY;
varying mediump vec2 vHeightSpacePosition;

const float MIN_AA = 1e-4;
const float BORDER_THICKNESS_TILES = 0.1; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner

void main() {
  vec2 outerBounds = vec2(0.5 * uAspect, 0.5);
  vec2 tileCounts = vec2(uTilesX, uTilesY);
  vec2 tilesHalf = max(tileCounts * 0.5, vec2(MIN_AA));
  vec2 tilesPerUnit = tilesHalf / outerBounds;
  vec2 borderThickness = max(vec2(BORDER_THICKNESS_TILES) / tilesPerUnit, vec2(0.0));
  vec2 innerBounds = outerBounds - borderThickness;

  float dInner = sdBox(vHeightSpacePosition, innerBounds);
  float aa = fwidth(dInner);
  float borderMask = smoothstep(0.0, aa, dInner);

  // Distances to the nearest edge in tile units
  vec2 distToEdge = tilesHalf - abs(vHeightSpacePosition) * tilesPerUnit;
  vec2 distAA = max(fwidth(distToEdge), vec2(MIN_AA));
  vec2 edgeMask =
    1.0 - smoothstep(vec2(BORDER_THICKNESS_TILES), vec2(BORDER_THICKNESS_TILES) + distAA, distToEdge);

  vec2 cornerLengths = vec2(CORNER_LENGTH_TILES);
  vec2 clampedDist = max(distToEdge, vec2(0.0));
  vec2 lengthMask =
    1.0 - smoothstep(cornerLengths, cornerLengths + distAA, clampedDist);

  float horizontalBracket = edgeMask.y * lengthMask.x;
  float verticalBracket = edgeMask.x * lengthMask.y;
  float cornerBrackets = max(horizontalBracket, verticalBracket);
  float bracketMask = borderMask * cornerBrackets;

  vec4 color = vec4(1.0, 1.0, 1.0, uOpacity * bracketMask);
  gl_FragColor = color;
}
