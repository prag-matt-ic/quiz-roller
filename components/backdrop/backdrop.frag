precision mediump float;

uniform sampler2D uBackdrop;
uniform float uDarkness;
uniform float uEdgeFade;
varying mediump vec2 vUv;

void main() {
  vec3 color = texture2D(uBackdrop, vUv).rgb;
  color *= 1.0 - uDarkness;

  float fadeWidth = max(uEdgeFade, 1e-4);
  vec2 edgeMask = smoothstep(vec2(0.0), vec2(fadeWidth), vec2(vUv.x, 1.0 - vUv.x));
  color *= edgeMask.x * edgeMask.y;

  gl_FragColor = vec4(color, 1.0);
}
