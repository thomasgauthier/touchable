import Canvas from "./framework/canvas";
import p5 from "p5";
import FrameBuffer from "./framework/framebuffer";
import GUI, { Controller } from "lil-gui";

export default class Game extends Canvas {
  fbos: {
    touchMaskFBO: FrameBuffer;
    currentFrameFBO: FrameBuffer;
    lastFrameFBO: FrameBuffer;
    heatedFBO: FrameBuffer;
    blurredFBO: FrameBuffer;
  }

  shaders: {
    heatmap: p5.Shader;
    heatmask: p5.Shader;
    textureRender: p5.Shader;
    blur: p5.Shader;
  }

  heat: p5.Image;

  lastTouches: { [key: string]: { x: number, y: number } } = {}
  currentTouches: { [key: string]: Touch } = {}

  gui: GUI;

  guiValues: {
    intensity: number;
    decay: number;
    radiusMultiplier: number;
    save: Function;
    stepToShow: string;
  };

  preload(): void {
    this.heat = this.loadImage('images/heat.png');

    this.loadShaders('heatmask')
    this.loadShaders('heatmap')
    this.loadShaders('textureRender')
    this.loadShaders('blur')
  }

  loadShaders(name: keyof Game['shaders']) {

    if (!this.shaders || !Object.keys(this.shaders).length) {
      (this.shaders as any) = {}
    }

    this.shaders[name] = this.loadShader(`shaders/${name}/${name}.vert`, `shaders/${name}/${name}.frag`)
  }

  setup() {
    this.pixelDensity(1)
    const canvas = this.createCanvas(this.windowWidth, this.windowHeight, this.WEBGL);

    (canvas.elt as HTMLCanvasElement).addEventListener('touchstart', (event) => {
      event?.preventDefault();

      this.currentTouches = {};

      for (let touch of event.touches as any as Touch[]) {
        this.currentTouches[touch.identifier] = touch
      }
    });

    (canvas.elt as HTMLCanvasElement).addEventListener('touchmove', (event) => {
      event?.preventDefault();

      for (let touch of event.touches as any as Touch[]) {
        this.currentTouches[touch.identifier] = touch
      }
    });

    (canvas.elt as HTMLCanvasElement).addEventListener('touchend', (event) => {
      event?.preventDefault();

      for (let touch of event.touches as any as Touch[]) {
        this.currentTouches[touch.identifier] = touch
      }
    });

    this.frameRate(60);

    this.background(100);
    this.noStroke();

    this.gui = new GUI();
    this.guiValues = {
      stepToShow: 'final',
      intensity: 0.3,
      decay: 0.01,
      radiusMultiplier: 30,
      save: () => {
        this.saveCanvas()
      }
    }

    this.fbos = {
      touchMaskFBO: new FrameBuffer(this),
      currentFrameFBO: new FrameBuffer(this),
      lastFrameFBO: new FrameBuffer(this),
      heatedFBO: new FrameBuffer(this),
      blurredFBO: new FrameBuffer(this),
    }

    this.gui.add(this.guiValues, 'intensity', 0, 1);
    this.gui.add(this.guiValues, 'decay', 0, 0.01);
    this.gui.add(this.guiValues, 'radiusMultiplier', 0, 50);
    this.gui.add(this.guiValues, 'stepToShow', ['final', ...Object.keys(this.fbos)])
    this.gui.add(this.guiValues, 'save')

    this.fbos.currentFrameFBO.draw(() => {
      this.clear(0, 0, 0, 1.0)
      this.push();
      this.fill('black');
      this.rect(0, 0, this.width, this.height);
      this.pop();
    })
  }

  draw() {
    this.translate(-this.width / 2, -this.height / 2)

    this.fbos.touchMaskFBO.draw(() => {
      this.clear(0, 0, 0, 1.0)
      this.push();

      if (this.touches.length) {

        for (let { id, x, y } of (this.touches as any)) {

          if (this.lastTouches[id]) {

            let from = this.createVector(this.lastTouches[id].x, this.lastTouches[id].y);
            let to = this.createVector(x, y);

            let { radiusX, radiusY } = this.currentTouches[id];

            this.stroke('white');
            this.strokeWeight((radiusX * this.guiValues.radiusMultiplier + radiusY * this.guiValues.radiusMultiplier) / 2);
            this.line(from.x, from.y, to.x, to.y);

            this.fill('white');
            this.noStroke();

            this.fill('black')
            this.ellipse(from.x, from.y, radiusX * this.guiValues.radiusMultiplier, radiusY * this.guiValues.radiusMultiplier);
            this.fill('white')

            this.ellipse(to.x, to.y, radiusX * this.guiValues.radiusMultiplier, radiusY * this.guiValues.radiusMultiplier);
          }
        }
      }
      this.resetShader();

      this.pop();
    })

    this.fbos.currentFrameFBO.draw(() => {
      this.clear(0, 0, 0, 1.0)
      this.push();
      this.shader(this.shaders.heatmask);
      this.shaders.heatmask.setUniform('last', this.fbos.lastFrameFBO.color);
      this.shaders.heatmask.setUniform('current', this.fbos.touchMaskFBO.color);
      this.shaders.heatmask.setUniform('intensity', this.guiValues.intensity)
      this.shaders.heatmask.setUniform('decay', this.guiValues.decay)

      this.rect(0, 0, this.width, this.height);
      this.resetShader();
      this.pop();
    })

    this.fbos.lastFrameFBO.draw(() => {
      this.clear(0, 0, 0, 1.0)
      this.push();
      this.shader(this.shaders.textureRender);
      this.shaders.textureRender.setUniform('image', this.fbos.currentFrameFBO.color);
      this.rect(0, 0, this.width, this.height);
      this.resetShader();
      this.pop();
    })

    this.fbos.heatedFBO.draw(() => {
      this.shader(this.shaders.heatmap);
      this.shaders.heatmap.setUniform('heated', this.fbos.currentFrameFBO.color);
      this.shaders.heatmap.setUniform('map', this.heat);
      this.rect(0, 0, this.width, this.height);

      this.resetShader()
    })

    this.fbos.blurredFBO.draw(() => {
      this.shader(this.shaders.blur);
      this.shaders.blur.setUniform('tex0', this.fbos.heatedFBO.color)
      this.shaders.blur.setUniform('texelSize', [1.0 / this.width, 1.0 / this.height]);
      this.shaders.blur.setUniform('direction', [1.0, 0.0]);
      this.rect(0, 0, this.width, this.height);

      this.resetShader()
    })


    if (this.guiValues.stepToShow == 'final') {
      this.shader(this.shaders.blur);
      this.shaders.blur.setUniform('tex0', this.fbos.blurredFBO.color)
      this.shaders.blur.setUniform('texelSize', [1.0 / this.width, 1.0 / this.height]);
      this.shaders.blur.setUniform('direction', [0.0, 1.0]);
      this.rect(0, 0, this.width, this.height);
    } else {
      this.shader(this.shaders.textureRender);

      this.shaders.textureRender.setUniform('image', (this.fbos as any)[this.guiValues.stepToShow].color)
      this.rect(0, 0, this.width, this.height);
    }

    this.resetShader();

    this.lastTouches = this.touches.reduce((acc: { [key: string]: { x: number, y: number } }, val: any) => {
      acc[val.id] = { x: val.x, y: val.y }

      return acc;
    }, {}) as typeof this.lastTouches;
  }


  windowResized(event?: object): void {
    this.resizeCanvas(this.windowWidth, this.windowHeight);
  }
}
