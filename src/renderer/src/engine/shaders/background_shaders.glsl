// Background Shader Functions for Procedural Backgrounds
// These are GLSL fragment shader functions that can be called from the main fragment shader

// ============ NIGHT SKY SHADER ============
// Creates a starfield with twinkling stars and nebula effects

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float starNoise(vec2 uv, float seed) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);

    // Four corners in 2D of a tile
    float a = hash(i + seed);
    float b = hash(i + vec2(1.0, 0.0) + seed);
    float c = hash(i + vec2(0.0, 1.0) + seed);
    float d = hash(i + vec2(1.0, 1.0) + seed);

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec4 nightSkyShader(vec2 uv, float time,
                    float starDensity,
                    float starBrightness,
                    float nebulaDensity,
                    vec4 nebulaColor,
                    float twinkleSpeed) {
    vec4 color = vec4(0.0, 0.0, 0.05, 1.0); // Dark blue base

    // Create stars
    float stars = starNoise(uv * 200.0 * starDensity, 0.0);
    stars = pow(stars, 10.0 - starDensity * 8.0);

    // Add twinkling
    float twinkle = sin(time * twinkleSpeed + hash(uv * 100.0) * 6.28) * 0.5 + 0.5;
    stars *= twinkle * starBrightness;

    // Add nebula
    float nebula = starNoise(uv * 3.0, 1.0) * starNoise(uv * 5.0, 2.0);
    nebula = pow(nebula, 2.0) * nebulaDensity;

    // Combine
    color.rgb += vec3(stars);
    color.rgb = mix(color.rgb, nebulaColor.rgb, nebula * nebulaColor.a);

    return color;
}

// ============ NETWORK SHADER ============
// Creates animated network of connected nodes

vec2 hashVec2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec4 networkShader(vec2 uv,
                   float time,
                   float nodeCount,
                   float connectionDistance,
                   vec4 nodeColor,
                   vec4 lineColor,
                   float animationSpeed,
                   float nodeSize) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0); // Black base

    int count = int(nodeCount);
    vec2 nodes[200];

    // Generate node positions with animation
    for (int i = 0; i < 200; i++) {
        if (i >= count) break;

        vec2 seed = vec2(float(i) * 0.123, float(i) * 0.456);
        vec2 offset = hashVec2(seed);
        vec2 velocity = (hashVec2(seed + vec2(1.0, 1.0)) - 0.5) * 0.1;

        nodes[i] = offset + velocity * time * animationSpeed;
        nodes[i] = fract(nodes[i]); // Wrap around

        // Draw nodes
        float dist = distance(uv, nodes[i]);
        float nodeMask = smoothstep(nodeSize, nodeSize * 0.5, dist);
        color = mix(color, nodeColor, nodeMask * nodeColor.a);
    }

    // Draw connections
    for (int i = 0; i < 200; i++) {
        if (i >= count) break;

        for (int j = i + 1; j < 200; j++) {
            if (j >= count) break;

            float nodeDist = distance(nodes[i], nodes[j]);
            if (nodeDist < connectionDistance) {
                // Calculate line distance
                vec2 pa = uv - nodes[i];
                vec2 ba = nodes[j] - nodes[i];
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                float lineDist = length(pa - ba * h);

                float lineWidth = 0.001;
                float lineMask = smoothstep(lineWidth, lineWidth * 0.5, lineDist);
                float fadeByDistance = 1.0 - (nodeDist / connectionDistance);

                color = mix(color, lineColor, lineMask * lineColor.a * fadeByDistance);
            }
        }
    }

    return color;
}

// ============ DAY SKY SHADER ============
// Creates a day sky with clouds and sun

float cloudNoise(vec2 uv) {
    float n = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;

    for (int i = 0; i < 6; i++) {
        n += starNoise(uv * frequency, float(i)) * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return n;
}

vec4 daySkyShader(vec2 uv,
                  float time,
                  vec4 skyColor,
                  float cloudDensity,
                  float cloudSpeed,
                  float sunIntensity,
                  vec2 sunPosition) {
    // Sky gradient
    vec4 color = mix(
        skyColor,
        vec4(0.6, 0.8, 1.0, 1.0),
        uv.y
    );

    // Clouds
    vec2 cloudUv = uv + vec2(time * cloudSpeed * 0.05, 0.0);
    float clouds = cloudNoise(cloudUv * 3.0);
    clouds = smoothstep(0.4, 0.8, clouds) * cloudDensity;

    vec4 cloudColor = vec4(1.0, 1.0, 1.0, clouds * 0.8);
    color = mix(color, cloudColor, cloudColor.a);

    // Sun
    float sunDist = distance(uv, sunPosition);
    float sun = smoothstep(0.1, 0.0, sunDist);
    float sunGlow = smoothstep(0.3, 0.0, sunDist) * 0.3;

    vec4 sunColor = vec4(1.0, 0.95, 0.8, 1.0) * sunIntensity;
    color = mix(color, sunColor, (sun + sunGlow));

    return color;
}

// ============ RINGS + BLUR SHADER ============
// Creates concentric rotating rings with blur effect

vec4 ringsBlurShader(vec2 uv,
                     float time,
                     float ringCount,
                     vec4 ringColor,
                     float blurAmount,
                     float rotationSpeed,
                     float radius,
                     float thickness) {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0); // Black base

    vec2 center = vec2(0.5, 0.5);
    vec2 pos = uv - center;

    // Rotate
    float angle = time * rotationSpeed;
    float c = cos(angle);
    float s = sin(angle);
    pos = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);

    float dist = length(pos);

    // Create rings
    for (float i = 0.0; i < 20.0; i += 1.0) {
        if (i >= ringCount) break;

        float ringRadius = radius * (i + 1.0) / ringCount;
        float ringDist = abs(dist - ringRadius);

        // Apply blur
        float blur = thickness * (1.0 + blurAmount);
        float ring = smoothstep(blur, blur * 0.5, ringDist);

        // Fade rings by distance
        float fade = 1.0 - (i / ringCount) * 0.5;

        vec4 currentRing = ringColor * ring * fade;
        color = mix(color, currentRing, currentRing.a * ringColor.a);
    }

    return color;
}
