uniform sampler2D uPositions;
uniform float uTime;
uniform float uDpr;

attribute float seed;

varying float vLife;
varying float vSeed;

// Debug: larger sizes for visibility
const float MIN_PT_SIZE = 14.0;
const float LG_PT_SIZE = 16.0;
const float XL_PT_SIZE = 20.0;

void main() {
    float minPtSize = MIN_PT_SIZE * uDpr;
    float lgPtSize = LG_PT_SIZE * uDpr;
    float xlPtSize = XL_PT_SIZE * uDpr;

    vec4 positionData = texture2D(uPositions, uv);
    vec3 pos = positionData.xyz;
    float life = positionData.w;

    vLife = life;
    vSeed = seed;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    // Subtle size variance per particle
    float modulatedSeed = fract(seed * 11.0);
    float stepSeed = step(0.85, modulatedSeed);
    float size = mix(mix(minPtSize, lgPtSize, modulatedSeed), xlPtSize, stepSeed);

    gl_PointSize = size;
}
