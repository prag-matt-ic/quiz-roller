precision highp float;

attribute vec3 aBarycentric;

varying vec3 vBarycentric;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPosition;

void main() {
  vBarycentric = aBarycentric;
  vPosition = position; // Pass local position for reveal effect

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}

