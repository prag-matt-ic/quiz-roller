precision mediump float;
precision mediump int;

varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;
varying mediump float vCameraFade;

uniform sampler2D uTexture;

const float ALPHA_EPSILON = 0.001;

void main() {
  lowp vec4 texel = texture2D(uTexture, vMirroredUv);
  if (texel.a <= ALPHA_EPSILON) discard;

  float alpha = texel.a * vCameraFade * vPlayerFade;

  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
