// Collectible Particle Point Vertex Shader (gem focused) - Optimized
precision highp float;

uniform float uBurstProgress; // 0.0 to 1.0
uniform vec3 uGemPosition;
uniform float uGemScale;
uniform float uTime;
uniform float uDpr;

attribute vec3 spawnPosition;
attribute vec3 gemTarget;
attribute float seed;
attribute vec3 colour;

varying lowp vec4 vColorAlpha; // rgb = color, a = opacity
varying mediump float vSoftness;

const float TWO_PI = 6.2831853;
const float EPSILON = 0.0001;
const vec3 NOISE_WEIGHTS = vec3(0.7, 0.4, 0.5);
const vec3 FLOAT_FREQ = vec3(0.35, 0.27, 0.41);
const float GEM_INTERIOR_SCALE = 0.9;
const float OCTA_INV_SQRT3 = 0.57735027;

// Cheap pseudo-random noise
// Replaced hash with smooth sine waves to prevent jitter
vec3 smoothNoise(float seed, float progress) {
    float t = progress * 3.0;
    return vec3(
        sin(seed * 12.0 + t),
        sin(seed * 23.0 + t * 1.2 + 1.0),
        cos(seed * 45.0 + t * 0.8 + 2.0)
    );
}

float easeOutCubic(in float t) {
    float inverted = 1.0 - t;
    return 1.0 - inverted * inverted * inverted;
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * OCTA_INV_SQRT3;
}

vec3 clampToOctahedron(vec3 p, float s) {
    vec3 absP = abs(p);
    float sum = absP.x + absP.y + absP.z;
    if (sum <= s) return p;
    float scale = s / max(sum, EPSILON);
    return p * scale;
}

void main() {
    float timingOffset = seed * 0.2;
    float normalizer = max(1.0 - timingOffset, EPSILON);
    float progress = clamp((uBurstProgress - timingOffset) * (1.0 / normalizer), 0.0, 1.0);
    float easedProgress = easeOutCubic(progress);
    float settleProgress = smoothstep(0.5, 1.0, progress);
    float inverseProgress = 1.0 - progress;

    vec4 hashedSeed = fract(seed * vec4(17.0, 27.0, 15.0, 13.0));

    // Use smooth sine noise for organic movement without jitter
    vec3 baseNoise = smoothNoise(seed, progress);
    
    vec3 swirlNoise = baseNoise * NOISE_WEIGHTS * inverseProgress;

    vec3 gemInterior = gemTarget * (uGemScale * GEM_INTERIOR_SCALE);
    vec3 gemTargetPosition = uGemPosition + gemInterior;

    vec3 liftPosition = mix(spawnPosition, gemTargetPosition, easedProgress);
    float arcHeight = mix(0.5, 1.4, hashedSeed.w) * max(uGemScale * 10.0, 0.5);
    float arcProfile = progress * (1.0 - progress);
    
    // Add outward burst spread on XZ plane
    vec2 burstDir = normalize(spawnPosition.xz);
    if (length(spawnPosition.xz) < EPSILON) burstDir = vec2(1.0, 0.0); // Fallback
    
    // Spread amount varies per particle
    float spreadAmount = mix(3.0, 8.0, hashedSeed.z) * uGemScale;
    
    liftPosition.y += arcHeight * arcProfile;
    liftPosition.xz += burstDir * spreadAmount * arcProfile;
    
    liftPosition += swirlNoise;

    float timePhase = uTime * 0.7; // Faster movement (was 0.4)
    vec3 floatWave = vec3(
        sin(timePhase * FLOAT_FREQ.x + seed * TWO_PI),
        sin(timePhase * FLOAT_FREQ.y + seed * 13.0),
        cos(timePhase * FLOAT_FREQ.z + seed * 7.0)
    );
    // Increased amplitude (was 0.2-0.5)
    floatWave *= uGemScale * mix(0.5, 1.2, hashedSeed.y);
    float interiorBound = uGemScale * GEM_INTERIOR_SCALE;
    vec3 floatingLocal = gemInterior + floatWave;
    float octaDistance = sdOctahedron(floatingLocal, interiorBound);
    if (octaDistance > 0.0) {
        floatingLocal = clampToOctahedron(floatingLocal, interiorBound);
    }
    vec3 floatingPosition = uGemPosition + floatingLocal;

    vec3 finalPosition = mix(liftPosition, floatingPosition, settleProgress);

    vec4 modelPosition = modelMatrix * vec4(finalPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    float baseSize = mix(12.0, 40.0, fract(seed * 17.0));
    
    // Sparkle logic: rare particles are larger and white
    bool isSparkle = hashedSeed.x > 0.9;
    if (isSparkle) {
        baseSize *= 4.0;
    }

    float sizeFade = 1.0 - easedProgress * 0.3;
    float perspectiveScale = projectionMatrix[1][1];
    float distanceToCamera = max(-viewPosition.z, EPSILON);
    float attenuation = clamp(perspectiveScale / distanceToCamera, 0.35, 2.8);
    gl_PointSize = baseSize * sizeFade * attenuation * uDpr;

    // --- Logic moved from Fragment Shader ---
    
    // Opacity calculations
    float appear = smoothstep(0.0, 0.15, progress);
    float settle = smoothstep(0.6, 1.0, progress);
    float trailFade = 1.0 - smoothstep(0.75, 1.0, progress);
    float linger = mix(trailFade, 1.0, settle);
    
    float opacityFactor = 1.0 - seed * 0.5;
    float finalOpacity = appear * linger * opacityFactor;

    // Color calculations
    float softness = fract(seed * 31.0);
    vec3 glowColor = mix(colour, vec3(1.0), softness);
    
    // Force sparkles to be pure white
    if (isSparkle) {
        glowColor = vec3(1.0, 0.99, 0.92); // Subtle off-white yellow
        finalOpacity = min(finalOpacity * 2.0, 1.0); // Slightly brighter/more opaque
        softness = 2.0; // Signal fragment shader to use pow2 glow
    }

    vColorAlpha = vec4(glowColor, finalOpacity);
    vSoftness = softness;
}
