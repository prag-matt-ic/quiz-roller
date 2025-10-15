// Marble fragment shader with integrated volumetric emission
precision highp float;

#pragma glslify: rotate = require(glsl-rotate/rotate)
#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uTime;
uniform float uColourRange; // [0,1] palette parameter
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
const float RM_ABSORB = 20.0;   // Beer-Lambert absorption
const float RM_BRIGHT = 1.0;     // Emission brightness
const float NOISE_SCALE = 0.6;   // Base noise frequency (normalized space)
const float NOISE_STRENGTH = 0.8;// Modulation of density
const float BLOB_RADIUS = 1.0;   // Radius in normalized space (1.0 = sphere radius)

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

// Compute palette range bounds without branching
void paletteRange(float range, out float minV, out float maxV) {
  float isLow = step(range, 0.35);
  float isMid = step(0.35, range) * step(range, 0.65);
  float isHigh = step(0.65, range);
  minV = isLow * 0.0 + isMid * 0.25 + isHigh * 0.5;
  maxV = isLow * 0.5 + isMid * 0.75 + isHigh * 1.0;
}

// Ray-sphere intersection; returns near/far along ray if hit
bool sphereRayBounds(in vec3 ro, in vec3 rd, in vec3 center, in float radius, out float tNear, out float tFar) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return false;
  h = sqrt(h);
  tNear = -b - h;
  tFar = -b + h;
  if (tFar < 0.0) return false; // sphere behind camera
  tNear = max(tNear, 0.0);
  return tFar > tNear;
}

// Shade base color slightly for depth
vec3 shadeVolumeSample(vec3 p, vec3 base) {
  vec3 n = normalize(p);
  vec3 l = normalize(vec3(0.3, 0.7, 0.5));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  vec3 ambient = base * 0.7;
  return ambient + base * diff * 0.8;
}

// Integrated volumetric emission inside the sphere in world space
vec4 raymarchMarbleVolume(
  in vec3 ro,
  in vec3 rd,
  in vec3 center,
  in float radius,
  in vec3 axis,
  in float angle,
  in float time,
  in float colourRange
) {
  float t0, t1;
  if (!sphereRayBounds(ro, rd, center, radius, t0, t1)) return vec4(0.0);

  // March inside the sphere only
  float dt = (t1 - t0) / float(RM_STEPS);
  vec3 accum = vec3(0.0);
  float alpha = 0.0;
  float t = t0;

  // Palette bounds
  float rangeMin, rangeMax;
  paletteRange(colourRange, rangeMin, rangeMax);

  for (int i = 0; i < RM_STEPS; i++) {
    vec3 p = ro + rd * t;          // world-space sample
    vec3 pw = p - center;          // to sphere center

    // Normalize to sphere space (radius = 1)
    vec3 pn = pw / radius;

    // Animate field with time drift
    vec3 drift = vec3(sin(time * 0.6) * 0.6, cos(time * 0.5) * 0.6, sin(time * 0.4) * 0.6);

    // Slight pulsation of core
    float pulse = 0.5 + 0.5 * sin(time * 1.0);
    float radiusScale = mix(0.66, 1.0, pulse);
    float d2 = length(pn) / radiusScale;
    float sphereMask = 1.0 - smoothstep(0.0, BLOB_RADIUS, d2);
    float centered = pow(sphereMask, 2.2);

    // Rotate sampling position to follow sphere rotation
    vec3 pr = rotate(pn, axis, angle);

    // Two-octave noise, roughly normalized to [-1,1]
    float n = noise(pr * NOISE_SCALE + drift);
    n += 0.5 * noise(pr * (NOISE_SCALE * 2.0) + drift * 1.5);
    n *= 1.0 / 1.5;

    // Density stays within sphere
    float density = clamp(centered * clamp(1.0 + NOISE_STRENGTH * n, 0.0, 1.5), 0.0, 1.0);

    // Beer-Lambert absorption
    float a = 1.0 - exp(-density * RM_ABSORB * dt);

    // Palette color
    float noiseVal = clamp(n * 0.5 + 0.5, 0.0, 1.0);
    float tPal = mix(rangeMin, rangeMax, noiseVal);
    vec3 baseCol = getColourFromPalette(tPal) * RM_BRIGHT;

    // Subtle lighting for depth
    vec3 shaded = shadeVolumeSample(pw, baseCol);
    vec3 contrib = shaded * a;

    accum += (1.0 - alpha) * contrib;
    alpha += (1.0 - alpha) * a;
    if (alpha > 0.98) break;
    t += dt;
  }

  return vec4(accum, alpha * RM_OPACITY);
}

void main() {
  // Base palette color via 3D noise in object space (as before)
  float n = noise(normalize(vLocalPos) * 0.3 + uTime * 0.08);
  float noiseValue = n * 0.5 + 0.5;

  float minV, maxV; paletteRange(uColourRange, minV, maxV);
  float t = mix(minV, maxV, noiseValue);
  vec3 baseColor = getColourFromPalette(t);

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
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPos - cameraPosition);
  vec4 emission = raymarchMarbleVolume(ro, rd, worldCenter, worldRadius, uAxis, uAngle, uTime, uColourRange);

  // Combine surface and emission (additive glow)
  vec3 finalColor = litSurface + emission.rgb;
  gl_FragColor = vec4(finalColor, 1.0);
}
