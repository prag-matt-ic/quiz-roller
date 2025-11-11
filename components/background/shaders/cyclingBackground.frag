precision mediump float;

uniform sampler2D uTextureA;
uniform sampler2D uTextureB;
uniform float uBlend;
uniform vec4 uEdgeIntensities;
uniform float uEdgeZoomStrength;

varying vec2 vUv;

const float EDGE_GRADIENT_WIDTH = 0.2;
const float EDGE_DARKEN_STRENGTH = 0.6;
const float MIN_ZOOM = 0.05;
const vec2 CENTER_UV = vec2(0.5);

void main() {
    float maxEdgeHorizontal = max(uEdgeIntensities.x, uEdgeIntensities.y);
    float maxEdgeVertical = max(uEdgeIntensities.z, uEdgeIntensities.w);
    float edgeThreat = max(maxEdgeHorizontal, maxEdgeVertical);

    float clampedZoom = clamp(edgeThreat * uEdgeZoomStrength, 0.0, 1.0);
    float zoomFactor = max(MIN_ZOOM, 1.0 - clampedZoom);
    vec2 centeredUv = vUv - CENTER_UV;
    vec2 sampleUv = clamp(CENTER_UV + centeredUv * zoomFactor, 0.0, 1.0);

    float blendFactor = clamp(uBlend, 0.0, 1.0);
    vec4 colorA = texture2D(uTextureA, sampleUv);
    vec4 colorB = texture2D(uTextureB, sampleUv);
    vec4 baseColor = mix(colorA, colorB, blendFactor);

    vec4 distanceToEdges = vec4(vUv.x, 1.0 - vUv.x, vUv.y, 1.0 - vUv.y);
    vec4 edgeWeights = (1.0 - smoothstep(vec4(0.0), vec4(EDGE_GRADIENT_WIDTH), distanceToEdges)) * uEdgeIntensities;

    float maxEdgeWeight = max(max(edgeWeights.x, edgeWeights.y), max(edgeWeights.z, edgeWeights.w));
    float edgeDarken = EDGE_DARKEN_STRENGTH * clamp(maxEdgeWeight, 0.0, 1.0);

    baseColor.rgb *= 1.0 - edgeDarken;
    gl_FragColor = baseColor;
}
