precision highp float;

uniform float uExitProgress;
uniform float uRaiseDistance;
uniform float uTileHeight;

varying float vGradientT;
varying float vVisibility;
varying highp vec3 vWorldNormal;
varying mediump vec2 vUv;

void main() {
  vec3 transformed = position;

  float lift = uExitProgress * uRaiseDistance;
  transformed.y += lift;

  float squash = mix(1.0, 0.9, uExitProgress);
  transformed.xz *= squash;

  vGradientT = clamp((position.y + uTileHeight * 0.5) / uTileHeight, 0.0, 1.0);
  vVisibility = 1.0 - uExitProgress;
  vWorldNormal = normalize(normalMatrix * normal);
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
