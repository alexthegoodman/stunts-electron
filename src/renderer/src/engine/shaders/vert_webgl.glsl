#version 300 es
precision highp float;
precision highp int;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_tex_coords;
layout(location = 2) in vec4 a_color;
layout(location = 3) in vec2 a_gradient_coords;
layout(location = 4) in float a_object_type;
layout(location = 5) in vec3 a_normal;

out vec2 v_tex_coords;
out vec4 v_color;
out vec2 v_gradient_coords;
flat out float v_object_type;
out vec3 v_normal;
out vec3 v_world_position;

uniform mat4 bindGroup0_0; // u_camera_view_proj
uniform vec2 bindGroup0_1; // u_window_size (changed from mat4 to vec2)
uniform mat4 bindGroup1_0; // u_model
uniform mat4 bindGroup3_0; // u_group

void main() {
    // Apply model and group transforms
    mat4 group_transform = bindGroup3_0;
    
    // Apply model and group transforms
    vec4 world_pos = bindGroup1_0 * group_transform * vec4(a_position, 1.0);
    v_world_position = world_pos.xyz;
    v_normal = normalize(mat3(bindGroup1_0 * group_transform) * a_normal);

    // Apply camera view-projection matrix
    gl_Position = bindGroup0_0 * world_pos;

    v_tex_coords = a_tex_coords;
    v_color = a_color;
    v_gradient_coords = a_gradient_coords;
    v_object_type = a_object_type;
}