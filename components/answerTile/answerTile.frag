// AnswerTile fragment shader
#pragma glslify: getColourFromPalette = require(../palette.glsl)

uniform float uConfirmingProgress;
uniform float uTileAspect; // width / height
uniform sampler2D uTextTexture;

varying vec2 vUv;

const float BORDER_FRACTION = 0.06; // fraction of full height
const vec4 BASE_COLOUR = vec4(0.0);
const float BORDER_WAVE_FREQUENCY = 3.0;
const float BORDER_WAVE_OFFSET = 0.5;

float sdBox(in vec2 position, in vec2 bounds) {
    vec2 distance = abs(position) - bounds;
    return length(max(distance, 0.0)) + min(max(distance.x, distance.y), 0.0);
}

void main() {
  // Always render the inner area; border reacts to uConfirmingProgress

  // Center UVs in [-0.5, 0.5]
  vec2 centeredUv = vUv - 0.5;
  
  // Scale UV X by aspect so units match in "height-space"
  vec2 positionHeightSpace = vec2(centeredUv.x * uTileAspect, centeredUv.y);
  
  // Plane bounds half-size in height-space
  vec2 outerBoundsHeightSpace = vec2(0.5 * uTileAspect, 0.5);
  float thickness = BORDER_FRACTION * uConfirmingProgress;
  vec2 innerBoundsHeightSpace = outerBoundsHeightSpace - vec2(thickness);

  float distanceFromInnerEdge = sdBox(positionHeightSpace, innerBoundsHeightSpace);
  float antiAliasing = fwidth(distanceFromInnerEdge);
  
  // 1 outside inner box (border), 0 inside
  float borderMask = smoothstep(0.0, antiAliasing, distanceFromInnerEdge);

  float borderColourPosition = sin(vUv.x * BORDER_WAVE_FREQUENCY) * BORDER_WAVE_OFFSET + BORDER_WAVE_OFFSET;
  vec3 borderColour = getColourFromPalette(borderColourPosition);
  vec4 color = mix(BASE_COLOUR, vec4(borderColour, 1.0), borderMask);

  // Sample the text texture and overlay it inside the inner area only
  float innerMask = 1.0 - borderMask;
  vec4 textSample = texture2D(uTextTexture, vUv);
  // Composite: keep border opaque, overlay text only where inner
  color = mix(color, textSample, textSample.a * innerMask);

  gl_FragColor = color;
}
