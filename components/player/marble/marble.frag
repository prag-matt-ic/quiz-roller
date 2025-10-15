// Marble fragment shader with integrated volumetric emission
precision highp float;

#pragma glslify: rotate = require(glsl-rotate/rotate)
#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)
#pragma glslify: paletteRange = require(../../paletteRange.glsl)

uniform float uTime;
uniform int uPlayerColourIndex; // 0,1,2: selected palette band
uniform sampler2D uNormalMap;
uniform float uNormalScale;
uniform vec3 uAxis;  // world rotation axis (normalized)
uniform float uAngle; // world rotation angle (radians)

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vWorldPos;
varying vec3 vWorldCenter;

// -------- Surface lighting constants --------
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
const float SPECULAR_POWER = 10.0;
const float AMBIENT_STRENGTH = 0.8;
const float DIFFUSE_STRENGTH = 0.5;
const float SPECULAR_STRENGTH = 0.4;

// -------- Volume constants (tune in-shader) --------
const int   RM_STEPS = 80;       // Marching steps
const float RM_OPACITY = 0.6;    // Final opacity scale for emission
const float RM_ABSORB = 20.0;    // Beer-Lambert absorption
const float RM_BRIGHT = 0.2;     // Emission brightness
const float NOISE_SCALE = 0.6;   // Base noise frequency (normalized space)
const float NOISE_STRENGTH = 0.8;// Modulation of density
const float BLOB_RADIUS = 1.0;   // Radius in normalized space (1.0 = sphere radius)

// -------- Volume animation constants --------
const float TIME_DRIFT_X_SPEED = 0.6;
const float TIME_DRIFT_X_SCALE = 0.6;
const float TIME_DRIFT_Y_SPEED = 0.5;
const float TIME_DRIFT_Y_SCALE = 0.6;
const float TIME_DRIFT_Z_SPEED = 0.4;
const float TIME_DRIFT_Z_SCALE = 0.6;
const float TIME_PULSE_SPEED = 1.0;
const float PULSE_MIN_SCALE = 0.66;
const float PULSE_MAX_SCALE = 1.0;
const float DENSITY_POWER = 2.2;
const float NOISE_OCTAVE_2_SCALE = 2.0;
const float NOISE_OCTAVE_2_WEIGHT = 0.5;
const float NOISE_OCTAVE_2_DRIFT = 1.5;
const float NOISE_NORMALIZATION = 1.5;
const float DENSITY_MAX_CLAMP = 1.5;
const float ALPHA_BREAK_THRESHOLD = 0.98;

// -------- Surface constants --------
const float NOISE_FREQUENCY = 0.3;
const float NOISE_TO_RANGE = 0.5;
const float NOISE_RANGE_OFFSET = 0.5;

// -------- Volume shading constants --------
const float VOLUME_AMBIENT_STRENGTH = 0.7;
const float VOLUME_DIFFUSE_STRENGTH = 0.8;

// -------- Helpers --------
// Perturb normal with normal map using tangent-space normal mapping
vec3 perturbNormal() {
  vec3 mapN = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  mapN.xy *= uNormalScale;

  vec3 q0 = dFdx(vViewPosition);
  vec3 q1 = dFdy(vViewPosition);
  vec2 st0 = dFdx(vUv);
  vec2 st1 = dFdy(vUv);

  vec3 N = normalize(vNormal);
  vec3 T = normalize(q0 * st1.t - q1 * st0.t);
  vec3 B = -normalize(cross(N, T));
  mat3 TBN = mat3(T, B, N);

  return normalize(TBN * mapN);
}

// Ray-sphere intersection; returns near/far along ray if hit
bool sphereRayBounds(in vec3 rayOrigin, in vec3 rayDirection, in vec3 center, in float radius, out float tNear, out float tFar) {
  vec3 originToCenter = rayOrigin - center;
  float b = dot(originToCenter, rayDirection);
  float c = dot(originToCenter, originToCenter) - radius * radius;
  float discriminant = b * b - c;
  if (discriminant < 0.0) return false; // no intersection
  discriminant = sqrt(discriminant);
  tNear = -b - discriminant;
  tFar = -b + discriminant;
  if (tFar < 0.0) return false; // sphere behind camera
  tNear = max(tNear, 0.0);
  return tFar > tNear;
}

// Shade base color slightly for depth
vec3 shadeVolumeSample(vec3 position, vec3 baseColor) {
  vec3 normal = normalize(position);
  vec3 lightDir = normalize(vec3(0.3, 0.7, 0.5));
  float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
  vec3 ambient = baseColor * VOLUME_AMBIENT_STRENGTH;
  return ambient + baseColor * diffuse * VOLUME_DIFFUSE_STRENGTH;
}

// Integrated volumetric emission inside the sphere in world space
vec4 raymarchMarbleVolume(
  in vec3 rayOrigin,
  in vec3 rayDirection,
  in vec3 center,
  in float radius,
  in vec3 axis,
  in float angle,
  in float time,
  in int colourIndex
) {
  float tNear, tFar;
  if (!sphereRayBounds(rayOrigin, rayDirection, center, radius, tNear, tFar)) return vec4(0.0);

  // March inside the sphere only
  float stepSize = (tFar - tNear) / float(RM_STEPS);
  vec3 accumulatedColor = vec3(0.0);
  float accumulatedAlpha = 0.0;
  float rayT = tNear;

  // Palette bounds
  float rangeMin, rangeMax;
  paletteRange(colourIndex, rangeMin, rangeMax);

  for (int i = 0; i < RM_STEPS; i++) {
    vec3 worldSample = rayOrigin + rayDirection * rayT;
    vec3 sphereLocal = worldSample - center;

    // Normalize to sphere space (radius = 1)
    vec3 normalized = sphereLocal / radius;

    // Animate field with time drift
    vec3 drift = vec3(
      sin(time * TIME_DRIFT_X_SPEED) * TIME_DRIFT_X_SCALE,
      cos(time * TIME_DRIFT_Y_SPEED) * TIME_DRIFT_Y_SCALE,
      sin(time * TIME_DRIFT_Z_SPEED) * TIME_DRIFT_Z_SCALE
    );

    // Slight pulsation of core
    float pulse = NOISE_RANGE_OFFSET + NOISE_RANGE_OFFSET * sin(time * TIME_PULSE_SPEED);
    float radiusScale = mix(PULSE_MIN_SCALE, PULSE_MAX_SCALE, pulse);
    float distanceFromCenter = length(normalized) / radiusScale;
    float sphereMask = 1.0 - smoothstep(0.0, BLOB_RADIUS, distanceFromCenter);
    float centeredDensity = pow(sphereMask, DENSITY_POWER);

    // Rotate sampling position to follow sphere rotation
    vec3 rotated = rotate(normalized, axis, angle);

    // Two-octave noise, roughly normalized to [-1,1]
    float noiseValue = noise(rotated * NOISE_SCALE + drift);
    noiseValue += NOISE_OCTAVE_2_WEIGHT * noise(rotated * (NOISE_SCALE * NOISE_OCTAVE_2_SCALE) + drift * NOISE_OCTAVE_2_DRIFT);
    noiseValue *= 1.0 / NOISE_NORMALIZATION;

    // Density stays within sphere
    float density = clamp(centeredDensity * clamp(1.0 + NOISE_STRENGTH * noiseValue, 0.0, DENSITY_MAX_CLAMP), 0.0, 1.0);

    // Beer-Lambert absorption
    float absorption = 1.0 - exp(-density * RM_ABSORB * stepSize);

    // Palette color
    float normalizedNoise = clamp(noiseValue * NOISE_TO_RANGE + NOISE_RANGE_OFFSET, 0.0, 1.0);
    float paletteT = mix(rangeMin, rangeMax, normalizedNoise);
    vec3 baseColor = getColourFromPalette(paletteT) * RM_BRIGHT;

    // Subtle lighting for depth
    vec3 shaded = shadeVolumeSample(sphereLocal, baseColor);
    vec3 contribution = shaded * absorption;

    accumulatedColor += (1.0 - accumulatedAlpha) * contribution;
    accumulatedAlpha += (1.0 - accumulatedAlpha) * absorption;
    if (accumulatedAlpha > ALPHA_BREAK_THRESHOLD) break;
    rayT += stepSize;
  }

  return vec4(accumulatedColor, accumulatedAlpha * RM_OPACITY);
}

void main() {
  // Base palette color via 3D noise in object space
  float noiseValue = noise(normalize(vLocalPos) * NOISE_FREQUENCY + uTime * 0.08);
  noiseValue = noiseValue * NOISE_TO_RANGE + NOISE_RANGE_OFFSET;

  float minValue, maxValue;
  paletteRange(uPlayerColourIndex, minValue, maxValue);
  float paletteT = mix(minValue, maxValue, noiseValue);
  vec3 baseColor = getColourFromPalette(paletteT);

  // Surface lighting with normal map
  vec3 normal = perturbNormal();
  vec3 viewDir = normalize(vViewPosition);
  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  vec3 halfDir = normalize(LIGHT_DIR + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), SPECULAR_POWER);
  vec3 litSurface = baseColor * (AMBIENT_STRENGTH + diffuse * DIFFUSE_STRENGTH) + specular * SPECULAR_STRENGTH;

  // Raymarch emission inside the sphere in world space
  vec3 worldCenter = vWorldCenter;
  float worldRadius = length(vWorldPos - worldCenter);
  vec3 rayOrigin = cameraPosition;
  vec3 rayDirection = normalize(vWorldPos - cameraPosition);
  vec4 emission = raymarchMarbleVolume(rayOrigin, rayDirection, worldCenter, worldRadius, uAxis, uAngle, uTime, uPlayerColourIndex);

  // Combine surface and emission (additive glow)
  vec3 finalColor = litSurface + emission.rgb;
  gl_FragColor = vec4(finalColor, 1.0);
}
