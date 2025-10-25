// Marble vertex shader
// Pass object-space position and normal to fragment for seamless spherical mapping
// Normal mapping for surface detail

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;

const float PI = 3.14159265359;

// Convert 3D position to spherical UV coordinates
vec2 sphericalUV(vec3 pos) {
  vec3 n = normalize(pos);
  float u = 0.5 + atan(n.z, n.x) / (2.0 * PI);
  float v = 0.5 - asin(n.y) / PI;
  return vec2(u, v);
}

void main() {
  vLocalPos = position;
  vUv = sphericalUV(position);

  // Calculate normal in view space for lighting
  vNormal = normalize(normalMatrix * normal);

  // Calculate view-space position for normal mapping
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}
