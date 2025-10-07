precision highp float;

uniform sampler2D uPositionTexture;

attribute vec2 textureUv;

varying vec3 vWorldPos;
varying float vAlpha;

void main() {
  // Sample position and alpha from GPU compute texture
  vec4 posData = texture2D(uPositionTexture, textureUv);
  vec3 instancePosition = posData.xyz;
  vAlpha = posData.a;
  
  // Transform vertex position by instance position
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  worldPos.xyz += instancePosition;
  
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

