// AnswerTile fragment shader
uniform float uTime;

varying vec2 vUv;

void main() {
  // Base: 25% white
  float baseAlpha = 0.25;

  // Barebones pulsation: varies 0..1 with time; at uTime=0 -> 0
  float modAmt = abs(sin(uTime * 4.0));

  // Fade alpha between 0.25 and 0.55
  float alpha = baseAlpha + 0.5 * modAmt;

  gl_FragColor = vec4(vec3(1.0), alpha);
}

