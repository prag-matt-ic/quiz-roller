precision highp float;

uniform sampler2D uPositionTexture;
uniform sampler2D uRowWorldPositions;
uniform float uGridCols;
uniform float uTileSize;
uniform float uRowCount;
uniform float uYMin;
uniform float uYMax;
uniform float uZFadeStart;
uniform float uZFadeEnd;
uniform float uCameraZ;
uniform float uScrollZ;

attribute vec2 textureUv;

varying highp vec3 vNoiseCoord;
varying mediump float vAlpha;

const float NOISE_SCALE = 0.12;
const float EPSILON = 1e-5;
const float COLUMN_JITTER_RANGE = 0.6;

float columnToWorldX(float columnIndex, float offset, float gridCols, float tileSize) {
  return (columnIndex - gridCols * 0.5 + 0.5) * tileSize + offset;
}

float sampleRowWorldZ(float rowIndex, float rowCount) {
  float clampedIndex = clamp(rowIndex, 0.0, max(rowCount - 1.0, 0.0));
  float u = (clampedIndex + 0.5) / max(rowCount, 1.0);
  return texture2D(uRowWorldPositions, vec2(u, 0.5)).r;
}

void main() {
  vec4 posData = texture2D(uPositionTexture, textureUv);
  float columnValue = posData.x;
  float y = posData.y;
  float rowIndex = posData.z;

  float columnIndex = floor(columnValue + 0.5);
  float jitter = fract(columnValue);
  float offset = (jitter - 0.5) * COLUMN_JITTER_RANGE * uTileSize;

  float worldX = columnToWorldX(columnIndex, offset, uGridCols, uTileSize);
  float worldZ = sampleRowWorldZ(rowIndex, uRowCount) + uScrollZ;

  vec3 instancePosition = vec3(worldX, y, worldZ);
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz + instancePosition;

  vNoiseCoord = worldPos * NOISE_SCALE;

  float yRange = max(uYMax - uYMin, EPSILON);
  float normalizedY = clamp((y - uYMin) / yRange, 0.0, 1.0);
  float fadeIn = smoothstep(0.0, 0.2, normalizedY);
  float fadeOut = smoothstep(0.0, 0.2, 1.0 - normalizedY);
  float alpha = fadeIn * fadeOut;
  float zDist = abs(worldZ - uCameraZ);
  float zFade = 1.0 - smoothstep(uZFadeStart, uZFadeEnd, zDist);
  vAlpha = alpha * zFade;

  vec4 viewPosition = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * viewPosition;
}
