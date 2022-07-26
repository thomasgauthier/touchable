precision mediump float;

// we need our texcoords for drawing textures
varying vec2 vTexCoord;

// images are sent to the shader as a variable type called sampler2D
uniform sampler2D heated;
uniform sampler2D map;

const vec4 base = vec4(0.0, 0.0, 1.0, 1.0);
const vec4 end = vec4(1.0, 0.0, 0.0, 1.0);

void main() {
    vec2 uv = vTexCoord;

    vec4 sample = texture2D(heated, uv);

    gl_FragColor = texture2D(map, vec2(sample.r, 0.5));
}
