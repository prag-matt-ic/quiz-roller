// Marble vertex shader
// Pass object-space position and normal to fragment for seamless spherical mapping
// Normal mapping for surface detail

varying highp vec3 vLocalPos;
varying mediump vec3 vNormal;
varying mediump vec2 vUv;
varying highp vec3 vViewPosition;

const float PI = 3.14159265359;

// Convert unit-length position to spherical UV coordinates
vec2 sphericalUV(vec3 unitPos) {
  float u = 0.5 + atan(unitPos.z, unitPos.x) / (2.0 * PI);
  float v = 0.5 - asin(unitPos.y) / PI;
  return vec2(u, v);
}

void main() {
  vLocalPos = position;
  vec3 unitLocalPos = normalize(position);
  vUv = sphericalUV(unitLocalPos);

  // Calculate normal in view space for lighting
  vNormal = normalize(normalMatrix * normal);

  // Calculate view-space position for normal mapping
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}
