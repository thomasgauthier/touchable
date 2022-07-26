precision mediump float;

// we need our texcoords for drawing textures
varying vec2 vTexCoord;

// images are sent to the shader as a variable type called sampler2D
uniform sampler2D image;

void main() {
    vec2 uv = vTexCoord;
    gl_FragColor = texture2D(image, uv);
}
