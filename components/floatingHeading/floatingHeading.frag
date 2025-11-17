varying vec2 vUv;

uniform sampler2D uTexture;
uniform float uOpacity;

void main() {
  vec2 flippedUv = vec2(1.0 - vUv.x, vUv.y);
  vec4 texel = texture2D(uTexture, flippedUv);
  float alpha = texel.a * uOpacity;

  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(texel.rgb, alpha);
}
