precision mediump float;

// we need our texcoords for drawing textures
varying vec2 vTexCoord;

// images are sent to the shader as a variable type called sampler2D
uniform sampler2D last;
uniform sampler2D current;

uniform float intensity;
uniform float decay;

const vec4 base = vec4(0.0, 0.0, 0.0, 1.0);
const vec4 end = vec4(1.0, 1.0, 1.0, 1.0);

void main() {
    vec2 uv = vTexCoord;
    float is = sign(length(vec3(texture2D(current, uv))));

    vec4 lastPixel = texture2D(last, uv);

    vec4 whatTo = mix(lastPixel, end, is * intensity);
    gl_FragColor = whatTo - vec4(decay, decay, decay, 0.0);
}
