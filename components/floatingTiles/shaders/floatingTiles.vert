precision highp float;

uniform sampler2D uPositionTexture;

attribute vec2 textureUv;

varying highp vec3 vNoiseCoord;
varying mediump float vAlpha;

const float NOISE_SCALE = 0.12;

void main() {
  // Sample position and alpha from GPU compute texture
  vec4 posData = texture2D(uPositionTexture, textureUv);
  vec3 instancePosition = posData.xyz;
  vAlpha = posData.a;

  // Build world-space position for the current vertex
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz + instancePosition;
  vec4 worldPos4 = vec4(worldPos, 1.0);

  // Pre-scale world position for noise lookups in the fragment shader
  vNoiseCoord = worldPos * NOISE_SCALE;

  vec4 viewPosition = viewMatrix * worldPos4;
  gl_Position = projectionMatrix * viewPosition;
}

