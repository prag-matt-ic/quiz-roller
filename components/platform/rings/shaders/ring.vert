precision highp float;

uniform float uTime;
uniform float uRotationSpeed;
uniform float uRotationPhase;
uniform vec3 uColor;
uniform vec3 uEmissive;

varying mediump vec3 vColor;

void main() {
  vec3 pos = position;
  vec3 n = normal;

  float angle = uTime * uRotationSpeed + uRotationPhase;
  float s = sin(angle);
  float c = cos(angle);
  mat2 rot = mat2(c, -s, s, c);

  pos.xz = rot * pos.xz;
  n.xz = rot * n.xz;

  vec3 vNormal = normalize(normalMatrix * n);
  const vec3 lightDir = vec3(0.46, 0.8, 0.5);
  float diff = max(dot(vNormal, lightDir), 0.0);
  float lighting = 0.5 + 0.5 * diff;

  vColor = uColor * lighting + uEmissive * 0.4;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
