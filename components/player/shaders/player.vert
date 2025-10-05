// Player sphere vertex shader
// Pass object-space position and normal to fragment for seamless spherical mapping

varying vec3 vLocalPos;
varying vec3 vNormal;

void main() {
  vLocalPos = position;              // object-space position (rotates with the mesh)
  vNormal = normalize(normalMatrix * normal);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

