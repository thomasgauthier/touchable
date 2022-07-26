// P5 manages its own WebGL textures normally, so that users don't
// have to worry about manually updating texture data on the GPU.
//
// However, if we're trying to use a framebuffer texture that we've
// drawn to via WebGL, we don't want to ever send data to it, since
// it gets content when we draw to it! So we need to make something
// that looks like a p5 texture but that never tries to update

import p5 from "p5"
// data in order to use framebuffer textures inside p5.
class RawTextureWrapper extends (p5 as any).Texture {
    width: any
    height: any
    src: any
    _renderer: any
    glTex: any
    glWrapS: any
    glWrapT: any

    constructor(renderer : p5.Renderer, obj: any, w: number, h: number) {
        super(renderer, obj)
        this.width = w
        this.height = h
        return this
    }

    _getTextureDataFromSource() {
        return this.src
    }

    init(tex: any) {
        const gl = this._renderer.GL
        this.glTex = tex

        this.glWrapS = this._renderer.textureWrapX
        this.glWrapT = this._renderer.textureWrapY

        this.setWrapMode(this.glWrapS, this.glWrapT)
        this.setInterpolation(this.glMinFilter, this.glMagFilter)
    }

    update() {
        return false
    }
}

class Framebuffer {
    _renderer: any
    framebuffer: any
    color: any
    constructor(canvas: any) {
        this._renderer = canvas._renderer

        const gl = this._renderer.GL

        const width = this._renderer.width
        const height = this._renderer.height
        const density = this._renderer._pInst._pixelDensity

        const colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,width * density, height * density, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);

        const colorP5Texture = new RawTextureWrapper(this._renderer, colorTexture, width * density, height * density)
        this._renderer.textures.push(colorP5Texture)

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.framebuffer = framebuffer
        this.color = colorTexture
    }

    draw(cb: () => void) {
        this._renderer.GL.bindFramebuffer(this._renderer.GL.FRAMEBUFFER, this.framebuffer)
        cb()
        this._renderer.GL.bindFramebuffer(this._renderer.GL.FRAMEBUFFER, null)
    }
}

export default Framebuffer
