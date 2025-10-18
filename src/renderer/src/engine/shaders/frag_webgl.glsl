#version 300 es
precision highp float;
precision highp int;

in vec2 v_tex_coords;
in vec4 v_color;
in vec2 v_gradient_coords;
flat in float v_object_type;

out vec4 fragColor;

// Bind group 1: Texture sampler
uniform sampler2D bindGroup1_1;

// Bind group 2: Gradient uniforms
layout(std140) uniform bindGroup2_0 {
    vec4 u_stop_offsets[2];      // vec4 * 2 = 8 floats
    vec4 u_stop_colors[8];       // 8 color stops
    float u_num_stops;
    float u_gradient_type;       // 0 = linear, 1 = radial
    vec2 u_start_point;
    vec2 u_end_point;
    vec2 u_center;
    float u_radius;
    float u_time;
    float u_animation_speed;
    float u_enabled;
    float u_border_radius;
};

// Bind group 3: Scene Shader uniforms
layout(std140) uniform bindGroup3_0 {
    float u_scene_shader_type;   // 0 = None, 1 = Painting, 2 = Future effects...
    float u_scene_intensity;     // Effect intensity
    float u_scene_brush_scale;   // Scale for brush strokes / edge size
    float u_scene_noise_strength; // Adds canvas noise
};

// Brush parameters (will use same uniform block, reusing unused fields for brushes)
// When v_object_type == 4u (brush), interpret fields as:
// u_num_stops = brushType (0=Noise, 1=Dots, 2=Lines, 3=Voronoi)
// u_gradient_type = noiseScale
// u_start_point.x = octaves
// u_start_point.y = persistence
// u_end_point.x = randomSeed
// u_end_point.y = dotDensity / lineAngle / cellSize
// u_center = lineSpacing (for lines brush)

// Shader background detection: When v_object_type == 9.0 (shader background)
// The u_gradient_type field will determine which shader to use:
// 0.0 = Night Sky, 1.0 = Network, 2.0 = Day Sky, 3.0 = Rings + Blur

float getOffset(int index) {
    int vec4_index = index / 4;
    int component_index = index % 4;
    if (component_index == 0) return u_stop_offsets[vec4_index].x;
    else if (component_index == 1) return u_stop_offsets[vec4_index].y;
    else if (component_index == 2) return u_stop_offsets[vec4_index].z;
    else return u_stop_offsets[vec4_index].w;
}

vec4 calculateGradientColor(vec2 coords) {
    float t;
    if (u_gradient_type < 0.5) {
        vec2 gradientVector = u_end_point - u_start_point;
        float currentTime = u_time * u_animation_speed;

        vec2 rotatedVector = vec2(
            gradientVector.x * cos(currentTime) - gradientVector.y * sin(currentTime),
            gradientVector.x * sin(currentTime) + gradientVector.y * cos(currentTime)
        );

        float projectedPoint = dot(coords - u_start_point, normalize(rotatedVector));
        t = clamp(projectedPoint / length(gradientVector), 0.0, 1.0);
    } else {
        float distance = length(coords - u_center);
        t = clamp(distance / u_radius, 0.0, 1.0);
    }

    vec4 color1 = u_stop_colors[0];
    vec4 color2 = u_stop_colors[0];
    float offset1 = getOffset(0);
    float offset2 = getOffset(0);

    for (int i = 0; i < int(u_num_stops) - 1; i++) {
        float curr_offset = getOffset(i);
        float next_offset = getOffset(i + 1);
        if (t >= curr_offset && t <= next_offset) {
            color1 = u_stop_colors[i];
            color2 = u_stop_colors[i + 1];
            offset1 = curr_offset;
            offset2 = next_offset;
            break;
        }
    }

    float mixVal = (t - offset1) / max((offset2 - offset1), 0.0001);
    return mix(color1, color2, mixVal);
}

vec4 getTextureColor(vec2 tex_coords) {
    return texture(bindGroup1_1, tex_coords);
}

// ============ BRUSH PROCEDURAL FUNCTIONS ============

// Pseudo-random function
float random(vec2 st, float seed) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233)) + seed) * 43758.5453123);
}

// 2D Noise function (value noise)
float noise(vec2 st, float seed) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i, seed);
    float b = random(i + vec2(1.0, 0.0), seed);
    float c = random(i + vec2(0.0, 1.0), seed);
    float d = random(i + vec2(1.0, 1.0), seed);

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion
float fbm(vec2 st, int octaves, float persistence, float seed) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(st * frequency, seed);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }

    return value / maxValue;
}

// Voronoi cell pattern
float voronoi(vec2 st, float cellSize, float seed) {
    vec2 scaledSt = st / cellSize;
    vec2 i_st = floor(scaledSt);
    vec2 f_st = fract(scaledSt);

    float minDist = 1.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = vec2(
                random(i_st + neighbor, seed),
                random(i_st + neighbor + vec2(0.1, 0.1), seed)
            );
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }

    return minDist;
}

// Dot pattern (halftone style)
float dotPattern(vec2 st, float density) {
    vec2 scaledSt = st * density;
    vec2 gridPos = fract(scaledSt);
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gridPos, center);

    return smoothstep(0.4, 0.3, dist);
}

// Line pattern (hatching style)
float linePattern(vec2 st, float angle, float spacing) {
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    vec2 rotated = vec2(
        st.x * cosAngle - st.y * sinAngle,
        st.x * sinAngle + st.y * cosAngle
    );

    float scaledY = rotated.y * spacing;
    float linePos = fract(scaledY);

    return smoothstep(0.45, 0.55, linePos);
}

// ============ SHADER BACKGROUND FUNCTIONS ============

// Hash function for procedural generation
float hash_shader(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float starNoise_shader(vec2 uv, float seed) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float a = hash_shader(i + seed);
    float b = hash_shader(i + vec2(1.0, 0.0) + seed);
    float c = hash_shader(i + vec2(0.0, 1.0) + seed);
    float d = hash_shader(i + vec2(1.0, 1.0) + seed);
    // Quintic interpolation for smoother result
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Night Sky Shader
vec4 nightSkyShader(vec2 uv) {
    float currentTime = u_time * u_animation_speed;
    // Extract params from uniform buffer
    float starDensity = u_num_stops;
    float starBrightness = u_start_point.x;
    float nebulaDensity = u_start_point.y;
    vec4 nebulaColor = u_stop_colors[0];
    float twinkleSpeed = u_end_point.x;

    vec4 color = vec4(0.0, 0.0, 0.05, 1.0);

    // Generate star field
    float stars = starNoise_shader(uv * 300.0 * starDensity, 0.0);
    stars = pow(stars, 12.0 - starDensity * 9.0);

    // Add individual twinkling per star using position-based offset
    float twinkle = starNoise_shader(uv * 300.0 * starDensity + currentTime * twinkleSpeed * 0.5, 10.0) * 0.6 + 0.4;
    twinkle = pow(twinkle, 3.0) * 0.6 + 0.4;
    stars *= twinkle * starBrightness;

    // Add nebula
    float nebula = starNoise_shader(uv * 3.0, 1.0) * starNoise_shader(uv * 5.0, 2.0);
    nebula = pow(nebula, 2.0) * nebulaDensity;

    color.rgb += vec3(stars);
    color.rgb = mix(color.rgb, nebulaColor.rgb, nebula * nebulaColor.a);
    return color;
}

// Network Shader
vec4 networkShader(vec2 uv) {
    float currentTime = u_time * u_animation_speed;
    float nodeCount = u_num_stops;
    float connectionDistance = u_start_point.x;
    vec4 nodeColor = u_stop_colors[0];
    vec4 lineColor = u_stop_colors[1];
    float animationSpeed = u_start_point.y;
    float nodeSize = u_end_point.x;

    vec4 color = vec4(0.05, 0.05, 0.1, 1.0); // Dark blue background
    int count = int(min(nodeCount, 50.0));

    // Store node positions
    vec2 nodes[50];
    for (int i = 0; i < 50; i++) {
        if (i >= count) break;
        vec2 seed = vec2(float(i) * 0.123, float(i) * 0.456);
        vec2 offset = vec2(hash_shader(seed), hash_shader(seed + vec2(1.0, 0.0)));
        vec2 velocity = (vec2(hash_shader(seed + vec2(1.0, 1.0)), hash_shader(seed + vec2(2.0, 2.0))) - 0.5) * 0.15;
        nodes[i] = fract(offset + velocity * currentTime * animationSpeed);
    }

    // Draw connections first (so nodes appear on top)
    for (int i = 0; i < 50; i++) {
        if (i >= count) break;
        for (int j = i + 1; j < 50; j++) {
            if (j >= count) break;

            float nodeDist = distance(nodes[i], nodes[j]);
            if (nodeDist < connectionDistance) {
                // Calculate distance from point to line segment
                vec2 pa = uv - nodes[i];
                vec2 ba = nodes[j] - nodes[i];
                float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                float lineDist = length(pa - ba * h);

                // Line width and fade
                float lineWidth = 0.002;
                float lineMask = smoothstep(lineWidth, 0.0, lineDist);
                float fadeByDistance = 1.0 - (nodeDist / connectionDistance);

                color = mix(color, lineColor, lineMask * lineColor.a * fadeByDistance * 0.6);
            }
        }
    }

    // Draw nodes on top
    for (int i = 0; i < 50; i++) {
        if (i >= count) break;
        float dist = distance(uv, nodes[i]);
        float nodeMask = smoothstep(nodeSize, nodeSize * 0.3, dist);

        // Glow effect
        float glow = smoothstep(nodeSize * 3.0, 0.0, dist) * 0.3;
        color = mix(color, nodeColor, glow);
        color = mix(color, nodeColor, nodeMask * nodeColor.a);
    }

    return color;
}

// Day Sky Shader
vec4 daySkyShader(vec2 uv) {
    float currentTime = u_time * u_animation_speed;
    vec4 skyColor = u_stop_colors[0];
    float cloudDensity = u_num_stops;
    float cloudSpeed = u_start_point.x;
    float sunIntensity = u_start_point.y;
    vec2 sunPosition = u_center;

    vec4 color = mix(skyColor, vec4(0.6, 0.8, 1.0, 1.0), uv.y);

    // Multiple cloud layers for more movement
    vec2 cloudUv1 = uv + vec2(currentTime * cloudSpeed * 0.1, 0.0);
    vec2 cloudUv2 = uv + vec2(currentTime * cloudSpeed * 0.15, currentTime * cloudSpeed * 0.02);

    float clouds1 = starNoise_shader(cloudUv1 * 3.0, 0.0);
    float clouds2 = starNoise_shader(cloudUv2 * 5.0, 1.0);
    float clouds = (clouds1 + clouds2 * 0.5) / 1.5;

    clouds = smoothstep(0.4, 0.8, clouds) * cloudDensity;
    vec4 cloudColor = vec4(1.0, 1.0, 1.0, clouds * 0.8);
    color = mix(color, cloudColor, cloudColor.a);

    float sunDist = distance(uv, sunPosition);
    float sun = smoothstep(0.1, 0.0, sunDist);
    float sunGlow = smoothstep(0.3, 0.0, sunDist) * 0.3;
    vec4 sunColor = vec4(1.0, 0.95, 0.8, 1.0) * sunIntensity;
    color = mix(color, sunColor, (sun + sunGlow));

    return color;
}

// Rings + Blur Shader - Floating rings in space
vec4 ringsBlurShader(vec2 uv) {
    float currentTime = u_time * (u_animation_speed / 10.0);
    float ringCount = u_num_stops;
    vec4 ringColor = u_stop_colors[0];
    float blurAmount = u_start_point.x;
    float rotationSpeed = u_start_point.y;
    float maxRadius = u_end_point.x;
    float thickness = u_end_point.y;

    // Deep space background with subtle stars
    vec4 color = vec4(0.01, 0.01, 0.05, 1.0);
    float stars = starNoise_shader(uv * 150.0, 0.0);
    stars = pow(stars, 15.0) * 0.3;
    color.rgb += vec3(stars);

    vec2 center = vec2(0.5, 0.5);
    vec2 pos = uv - center;

    // Rotate the entire ring system
    float angle = currentTime * rotationSpeed * 0.3;
    float c = cos(angle);
    float s = sin(angle);
    pos = vec2(pos.x * c - pos.y * s, pos.x * s + pos.y * c);

    int count = int(min(ringCount, 20.0));

    // Draw multiple rings with perspective and blur
    for (float i = 0.0; i < 20.0; i += 1.0) {
        if (i >= float(count)) break;

        // Varying ring positions and sizes
        float ringIndex = i / float(count);
        float ringRadius = 0.15 + ringIndex * maxRadius * 0.7;

        // Add slight offset to each ring for depth
        vec2 ringOffset = vec2(
            sin(currentTime * 0.5 + i * 0.7) * 0.05,
            cos(currentTime * 0.3 + i * 0.5) * 0.03
        );
        vec2 ringPos = pos - ringOffset;

        // Calculate distance from ring
        float dist = length(ringPos);
        float ringDist = abs(dist - ringRadius);

        // Apply blur with soft falloff
        float blurSize = thickness * (1.0 + blurAmount * 2.0);
        float innerBlur = blurSize * 0.3;
        float outerBlur = blurSize;

        // Create ring with soft edges
        float ring = 1.0 - smoothstep(innerBlur, outerBlur, ringDist);

        // Add glow effect
        float glow = exp(-ringDist * (15.0 - blurAmount * 10.0)) * 0.5;

        // Fade based on ring position (depth effect)
        float depthFade = 0.4 + 0.6 * (1.0 - ringIndex);

        // Color variation per ring
        vec3 ringTint = ringColor.rgb;
        ringTint += vec3(sin(i * 0.5) * 0.2, cos(i * 0.7) * 0.2, sin(i * 1.1) * 0.2);

        // Combine ring and glow
        float intensity = (ring + glow) * depthFade;
        color.rgb = mix(color.rgb, ringTint, intensity * ringColor.a);
    }

    return color;
}

// Calculate procedural brush color
vec4 calculateBrushColor(vec2 worldPos) {
    // Decode brush parameters from gradient uniform block
    float brushType = u_num_stops;
    float noiseScale = u_gradient_type;
    int octaves = int(u_start_point.x);
    float persistence = u_start_point.y;
    float randomSeed = u_end_point.x;
    float param1 = u_end_point.y; // dotDensity / lineAngle / cellSize
    float param2 = u_center.x; // lineSpacing

    vec2 uv = worldPos * noiseScale;
    float proceduralValue = 1.0;

    if (brushType > 0.5 && brushType < 1.5) {
        // Noise brush
        proceduralValue = fbm(uv, octaves, persistence, randomSeed);
    } else if (brushType > 1.5 && brushType < 2.5) {
        // Dots brush
        proceduralValue = dotPattern(uv, param1);
    } else if (brushType > 2.5 && brushType < 3.5) {
        // Lines brush
        proceduralValue = linePattern(uv, param1, param2);
    } else if (brushType > 3.5 && brushType < 4.5) {
        // Voronoi brush
        proceduralValue = voronoi(uv, param1, randomSeed);
    }

    return vec4(vec3(1.0), proceduralValue);
}

// ============ SCENE SHADER: PAINTING EFFECT ============
vec4 paintingSceneShader(vec2 uv, vec4 color) {
    // Parameters
    float scale = u_scene_brush_scale;
    float intensity = u_scene_intensity;
    float noiseStrength = u_scene_noise_strength;

    // Apply small coordinate perturbation to mimic brush texture
    float n1 = fbm(uv * scale * 2.0, 3, 0.5, 12.3);
    float n2 = fbm(uv * scale * 3.0 + vec2(3.7), 3, 0.5, 45.1);
    vec2 offset = vec2(n1, n2) * 0.005 * intensity;

    vec2 newUV = uv + offset;

    // Slightly blur / simplify colors (posterization)
    vec4 texCol = texture(bindGroup1_1, newUV);
    vec4 mixedColor = mix(color, texCol, 0.4);

    // Posterize to emulate paint layers
    vec3 quantized = floor(mixedColor.rgb * (6.0 - 4.0 * intensity)) / (6.0 - 4.0 * intensity);

    // Add subtle canvas noise
    float canvas = random(uv * 500.0, 1.0) * noiseStrength;
    vec3 finalRGB = quantized + vec3(canvas * 0.1);

    // Slight saturation boost
    float avg = dot(finalRGB, vec3(0.333));
    finalRGB = mix(vec3(avg), finalRGB, 1.2);

    return vec4(finalRGB, color.a);
}

void main() {
    vec4 tex_color = getTextureColor(v_tex_coords);
    vec4 final_color;

    if (v_object_type < 0.5) {
        // Polygon with optional gradient
        if (u_enabled > 0.5 && u_num_stops > 0.5) {
            final_color = calculateGradientColor(v_gradient_coords);
        } else {
            final_color = v_color;
        }
    } else if (v_object_type > 3.5 && v_object_type < 4.5) {
        // Brush with procedural texture
        vec4 proceduralColor = calculateBrushColor(v_gradient_coords);
        final_color = proceduralColor;
        // final_color = v_color * proceduralColor;
        // final_color = vec4(0.0,1.0,0.0,1.0);
    } else if (v_object_type == 9.0 || v_object_type == 6.0) {
        // Shader background (object_type == 9.0)
        // u_gradient_type determines which shader: 0=NightSky, 1=Network, 2=DaySky, 3=RingsBlur
        if (u_gradient_type < 0.5) {
            final_color = nightSkyShader(v_tex_coords);
        } else if (u_gradient_type < 1.5) {
            final_color = networkShader(v_tex_coords);
        } else if (u_gradient_type < 2.5) {
            final_color = daySkyShader(v_tex_coords);
        } else {
            final_color = ringsBlurShader(v_tex_coords);
        }
    } else {
        // Image/Video/Text with texture
        final_color = tex_color * v_color;
    }

    // Apply border radius for images (2) and videos (3)
    if ((v_object_type > 1.5 && v_object_type < 2.5) || (v_object_type > 2.5 && v_object_type < 3.5)) {
    // if (v_object_type != 0u) {
        if (u_border_radius > 0.0) {
            // Convert tex_coords from [0,1] to [-0.5, 0.5] range
            vec2 pos = v_tex_coords - vec2(0.5);

            // Calculate distance from the edge of the rectangle
            vec2 d = abs(pos) - vec2(0.5 - u_border_radius);

            // Calculate rounded rectangle SDF
            float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - u_border_radius;

            // Create smooth alpha based on distance
            float alpha = 1.0 - smoothstep(-0.001, 0.001, dist);

            // Apply alpha to final color
            final_color.a *= alpha;
        }
    }

    // testing
    // final_color = v_color;

    // Apply Scene Shader if enabled
    if (u_scene_shader_type > 0.5) {
        if (u_scene_shader_type < 1.5) {
            final_color = paintingSceneShader(v_tex_coords, final_color);
        }
        // (Future effects could go here: e.g. 2.0 = watercolor, 3.0 = pixelation, etc.)
    }

    fragColor = final_color;
}