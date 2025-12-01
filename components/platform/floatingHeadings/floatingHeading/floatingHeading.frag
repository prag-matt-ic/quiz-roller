precision mediump float;
precision mediump int;

varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;
varying mediump float vCameraFade;

uniform sampler2D uTexture;
uniform sampler2D uNoiseTexture;
uniform mediump float uUseNoiseFade;

const float ALPHA_EPSILON = 0.001;
const float DISSOLVE_WIDTH = 0.2;

void main() {
  lowp vec4 texel = texture2D(uTexture, vMirroredUv);
  if (texel.a <= ALPHA_EPSILON) discard;

  float combinedFade = vCameraFade * vPlayerFade;
  float dissolve;

  if (uUseNoiseFade > 0.5) {
    float noiseSample = texture2D(uNoiseTexture, vMirroredUv).r * 0.4;
    dissolve = smoothstep(
      noiseSample - DISSOLVE_WIDTH,
      noiseSample + DISSOLVE_WIDTH,
      combinedFade
    );
  } else {
    dissolve = combinedFade;
  }

  float alpha = texel.a * dissolve;

  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
