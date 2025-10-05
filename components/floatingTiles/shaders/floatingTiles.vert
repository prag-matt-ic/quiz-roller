precision highp float;

varying vec3 vWorldPos;

void main() {
  // Compose world position using instance transform
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

