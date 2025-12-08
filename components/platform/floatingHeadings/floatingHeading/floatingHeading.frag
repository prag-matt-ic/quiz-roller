precision mediump float;
precision mediump int;

varying mediump vec2 vMirroredUv;
varying mediump float vCameraFade;

uniform sampler2D uTexture;
uniform sampler2D uNoiseTexture;
uniform mediump float uUseNoiseFade;

const float ALPHA_EPSILON = 0.001;
const float DISSOLVE_WIDTH = 0.2;

void main() {
  lowp vec4 texel = texture2D(uTexture, vMirroredUv);
  if (texel.a <= ALPHA_EPSILON) discard;

  float dissolve;

  if (uUseNoiseFade > 0.5) {
    float noiseSample = texture2D(uNoiseTexture, vMirroredUv).r;
    float noiseEdge = noiseSample * 0.3;
    float noiseStrength = mix(0.65, 1.0, noiseSample);
    dissolve = smoothstep(
      noiseEdge - DISSOLVE_WIDTH,
      noiseEdge + DISSOLVE_WIDTH,
      vCameraFade * noiseStrength
    );
  } else {
    dissolve = vCameraFade;
  }

  float alpha = texel.a * dissolve;

  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
