precision mediump float;

varying vec4 vColorAlpha;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float dist = length(centered);
  float circle = 1.0 - smoothstep(0.35, 0.5, dist);

  float alpha = vColorAlpha.a * circle;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColorAlpha.rgb, alpha);
}
