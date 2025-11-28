precision highp float;

uniform float uTime;
uniform float uRotationSpeed;
uniform float uRotationPhase;
uniform vec3 uColor;
uniform vec3 uEmissive;

varying mediump vec3 vColor;

// Normalized direction from (0.46, 0.8, 0.5)
const vec3 LIGHT_DIR = vec3(0.4383, 0.7622, 0.4764);

void main() {
  // Rotation
  float angle = uTime * uRotationSpeed + uRotationPhase;
  float s = sin(angle);
  float c = cos(angle);
  mat2 rot = mat2(c, -s, s, c);

  // Transform
  vec3 pos = position;
  vec3 n = normal;

  pos.xz = rot * pos.xz;
  n.xz = rot * n.xz;

  // Lighting
  vec3 vNormal = normalize(normalMatrix * n);
  float diff = max(dot(vNormal, LIGHT_DIR), 0.0);
  float lighting = 0.5 + 0.5 * diff;

  vColor = uColor * lighting + uEmissive * 0.4;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
