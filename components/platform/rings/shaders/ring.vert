precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uEmissive;

varying vec3 vColor;

void main() {
  vec3 pos = position;
  vec3 n = normal;
  
  // Rotate both position and normal
  float s = sin(uTime);
  float c = cos(uTime);
  mat2 rot = mat2(c, -s, s, c);
  
  pos.xz = rot * pos.xz;
  n.xz = rot * n.xz;
  
  vec3 vNormal = normalize(normalMatrix * n);

  // Simple directional light (normalized vec3(0.5, 0.8, 0.5))
  const vec3 lightDir = vec3(0.46, 0.8, 0.5);
  float diff = max(dot(vNormal, lightDir), 0.0);
  
  // Ambient + Diffuse
  vec3 lighting = vec3(0.5) + vec3(0.5) * diff;
  
  // Combine base color with lighting and add emissive
  vColor = uColor * lighting + uEmissive * 0.4;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
