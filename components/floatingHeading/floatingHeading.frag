precision mediump float;
precision mediump int;

#pragma glslify: noise2d = require('glsl-noise/simplex/2d')

varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;
varying mediump float vCameraFade;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uTime;

const float ALPHA_EPSILON = 0.001;
const float NOISE_SCALE = 0.5;
const float NOISE_SPEED = 0.2;
const float NOISE_REVEAL_WIDTH = 0.4;

void main() {
  lowp vec4 texel = texture2D(uTexture, vMirroredUv);
  if (texel.a <= ALPHA_EPSILON) discard;

  float noisyReveal;
  if (uOpacity > 0.0 && uOpacity < 1.0) {
    float timeOffset = uTime * NOISE_SPEED;
    vec2 noiseSampleUv = vMirroredUv * NOISE_SCALE + vec2(timeOffset, -timeOffset);
    float noiseValue = noise2d(noiseSampleUv) * 0.5 + 0.5;
    noisyReveal = smoothstep(noiseValue - NOISE_REVEAL_WIDTH, noiseValue + NOISE_REVEAL_WIDTH, uOpacity);
  } else {
    noisyReveal = step(0.0, uOpacity);
  }

  float alpha = texel.a * uOpacity * noisyReveal * vPlayerFade * vCameraFade;

  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
