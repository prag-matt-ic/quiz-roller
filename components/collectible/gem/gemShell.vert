precision highp float;
precision highp int;

attribute vec3 aBarycentric;

varying vec3 vBarycentric;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vBarycentric = aBarycentric;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}

