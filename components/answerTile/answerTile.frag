// AnswerTile fragment shader
#pragma glslify: getColourFromPalette = require(../palette.glsl)

uniform float uConfirmingProgress;
uniform float uTileAspect; // width / height
uniform float uTime;

varying vec2 vUv;

const float BORDER_FRACTION = 0.08; // fraction of full height
const vec4 BASE_COLOUR = vec4(1.0, 1.0, 1.0, 0.6);

float sdBox(in vec2 p, in vec2 b) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}


void main() {
  if (uConfirmingProgress <= 0.0) {
    gl_FragColor = BASE_COLOUR;
    return;
  }
  // Center UVs in [-0.5, 0.5]
  vec2 p = vUv - 0.5;

  // Scale UV X by aspect so units match in "height-space"
  vec2 pH = vec2(p.x * uTileAspect, p.y);
  
  // Plane bounds half-size in height-space
  vec2 bOuterH = vec2(0.5 * uTileAspect, 0.5);

  float thickness = BORDER_FRACTION * uConfirmingProgress;
  vec2 bInnerH = bOuterH - vec2(thickness);
  
  float d = sdBox(pH, bInnerH);
  float aa = fwidth(d);
  
  // 1 outside inner box (border), 0 inside (white)
  float borderMask = smoothstep(0.0, aa, d);

  float borderColourP = sin(vUv.x + uTime * 0.4) * 0.5 + 0.5;
  vec3 borderColour = getColourFromPalette(borderColourP);
  vec4 color = mix(BASE_COLOUR, vec4(borderColour, 1.0), borderMask);

  gl_FragColor = color;
}
