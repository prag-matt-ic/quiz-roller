precision mediump float;

uniform sampler2D uBackdrop;
varying mediump vec2 vUv;
const float DARKNESS = 0.1;
const float EDGE_FADE = 0.2;

void main() {
  vec3 color = texture2D(uBackdrop, vUv).rgb;
  color *= 1.0 - DARKNESS;

  float fadeWidth = max(EDGE_FADE, 1e-4);
  vec2 edgeMask = smoothstep(vec2(0.0), vec2(fadeWidth), vec2(vUv.x, 1.0 - vUv.x));
  color *= edgeMask.x * edgeMask.y;

  gl_FragColor = vec4(color, 1.0);
}
