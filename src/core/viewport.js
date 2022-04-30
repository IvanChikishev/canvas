function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

const GL_EVENT = new CustomEvent("canvas->stats", {
  detail: { fps: 0, totalNodes: 0, renderNodes: 0 },
});

export class Viewport {
  scene = {
    width: 3000,
    height: 1000,
    dom: [
      {
        type: "circle",
        position: {
          x: 100,
          y: 100,
        },
        color: `rgb(${getRandomArbitrary(0, 255)}, ${getRandomArbitrary(
          0,
          255
        )}, ${getRandomArbitrary(0, 255)})`,
        radius: 90,
        name: Math.random().toString(36).slice(2, 7),
      },
      ...new Array(10).fill(null).map(() => ({
        type: "function",
        position: {
          x: 300,
          y: 100,
        },
        name: Math.random().toString(36).slice(2, 7),
      })),
    ],

    selected: {
      isEnabled: false,
      elementId: null,
    },
    // dom: new Array(20).fill(null).map(() => {
    //   return {
    //     type: "circle",
    //     position: {
    //       x: getRandomArbitrary(100, 1000),
    //       y: getRandomArbitrary(100, 1000),
    //     },
    //     color: `rgb(${getRandomArbitrary(0, 255)}, ${getRandomArbitrary(
    //       0,
    //       255
    //     )}, ${getRandomArbitrary(0, 255)})`,
    //     radius: 90,
    //     name: Math.random().toString(36).slice(2, 7),
    //   };
    // }),
    renderDom: [],

    focusElement: {
      target: null,
    },

    update: true,
  };

  camera = {
    _storage: {
      focus: {
        isEnabled: false,
        x: -1,
        y: -1,
      },

      position: {
        x: 0,
        y: 0,
      },
    },
  };

  engine = {
    fps: 0,
    times: [],
    t: performance.now(),
  };
  /**
   *
   * @private
   * @type {CanvasRenderingContext2D}
   */
  _context;
  /**
   *
   * @param properties {{width?: number, height?: number, selector: string}}
   */
  constructor(properties) {
    this._canvas = document.querySelector(properties?.selector);

    if (!this._canvas) {
      throw new Error("Canvas не существует или не был инициализирован");
    }

    this._context = this._canvas.getContext("2d");

    const pixelRatio = Viewport.ratio;

    const width = properties.width ?? 800;
    const height = properties.height ?? 600;

    this._canvas.width = width * pixelRatio;
    this._canvas.height = height * pixelRatio;

    this._canvas.style.width = width + "px";
    this._canvas.style.height = height + "px";

    this._context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    this._canvas.addEventListener("mousedown", (event) => {
      const element = this.scene.renderDom.findIndex((element, index) => {
        const cameraX =
          this.camera._storage.position.x +
          event.pageX -
          this._canvas.offsetLeft;

        const cameraY =
          this.camera._storage.position.y +
          event.pageY -
          this._canvas.offsetTop;

        if (element.type === "function") {
          return (
            cameraX > element.position.x &&
            cameraX < element.position.x + 300 &&
            cameraY > element.position.y &&
            cameraY < element.position.y + 250
          );
        } else if (element.type === "circle") {
          return (
            (cameraX - element.position.x) ** 2 +
              (cameraY - element.position.y) ** 2 <=
            element.radius ** 2
          );
        }
      });

      if (element >= 0) {
        this.scene.selected.isEnabled = true;
        this.scene.selected.elementId = element;

        const globalIndex = this.scene.dom.findIndex(
          (e) =>
            e.name === this.scene.renderDom[this.scene.selected.elementId].name
        );

        let b = this.scene.dom[globalIndex];

        this.scene.dom[globalIndex] = this.scene.dom[this.scene.dom.length - 1];
        this.scene.dom[this.scene.dom.length - 1] = b;

        this.scene.focusElement.target =
          this.scene.dom[this.scene.dom.length - 1];

        // select current element
        this.scene.focusElement.target.isFocus = true;

        this.camera._storage.focus = {
          isEnabled: false,
          x: event.pageX,
          y: event.pageY,
        };

        return;
      } else {
        this.scene.selected.isEnabled = false;
        this.scene.selected.elementId = null;

        // unselected before element
        if (this.scene.focusElement.target)
          this.scene.focusElement.target.isFocus = false;
      }

      this.camera._storage.focus = {
        isEnabled: true,
        x: event.pageX,
        y: event.pageY,
      };
    });

    this._canvas.addEventListener("mousemove", (event) => {
      if (this.scene.focusElement.target) {
        if (
          this.scene.focusElement.target.isFocus &&
          this.scene.focusElement.target.type === "function"
        ) {
          const element = this.scene.focusElement.target;

          const cameraX = event.pageX;
          const cameraY = event.pageY;

          element.position.x = this.camera._storage.position.x + cameraX - 150;
          element.position.y = this.camera._storage.position.y + cameraY - 125;

          if (element.position.x + 320 >= this.scene.width) {
            element.position.x = this.scene.width - 320;
          }

          if (element.position.x <= 20) {
            element.position.x = 20;
          }

          if (element.position.y + 270 >= this.scene.height) {
            element.position.y = this.scene.height - 270;
          }

          if (element.position.y <= 20) {
            element.position.y = 20;
          }

          return;
        }
      }

      if (this.camera._storage.focus.isEnabled) {
        const x = this.camera._storage.focus.x - event.pageX;
        const y = this.camera._storage.focus.y - event.pageY;

        this.camera._storage.position.x += x / 50;
        this.camera._storage.position.y += y / 50;

        // minimal zone
        if (this.camera._storage.position.y < 0) {
          this.camera._storage.position.y = 0;
        }
        // end zone
        else if (
          this.camera._storage.position.y + this._canvas.height / 2 >=
          this.scene.height
        ) {
          this.camera._storage.position.y =
            this.scene.height -
            (this.camera._storage.position.y +
              this._canvas.height / 2 -
              this.camera._storage.position.y);
        }

        // min zone
        if (this.camera._storage.position.x < 0) {
          this.camera._storage.position.x = 0;
        }

        // max zone
        else if (
          this.camera._storage.position.x + this._canvas.width / 2 >=
          this.scene.width
        ) {
          this.camera._storage.position.x =
            this.scene.width -
            (this.camera._storage.position.x +
              this._canvas.width / 2 -
              this.camera._storage.position.x);
        }
      }
    });

    window.addEventListener("mouseup", (event) => {
      this.camera._storage.focus.isEnabled = false;

      if (this.scene.focusElement.target)
        this.scene.focusElement.target.isFocus = false;
    });
  }

  fillBackground() {
    this._context.fillStyle = "rgb(201,201,201)";
    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
  }

  _calculateTimings() {
    const now = performance.now();

    while (this.engine.times.length > 0 && this.engine.times[0] <= now - 1000) {
      this.engine.times.shift();
    }

    this.engine.times.push(now);
    this.engine.fps = this.engine.times.length;
  }

  update(timestamp) {
    this._calculateTimings();

    if (this.engine.t + 100 < performance.now()) {
      window.dispatchEvent(
        new CustomEvent("canvas->stats", {
          detail: {
            fps: this.engine.fps,
            totalNodes: this.scene.dom.length,
            renderNodes: this.scene.renderDom.length,
          },
        })
      );

      this.engine.t = performance.now();
    }

    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this.fillBackground();

    this.scene.renderDom.splice(0);

    for (const [elementId, element] of Object.entries(this.scene.dom)) {
      switch (element.type) {
        case "function": {
          if (
            this.camera._storage.position.x + this._canvas.width / 2 >
              element.position.x - 300 &&
            this.camera._storage.position.y + this._canvas.width / 2 >
              element.position.y - 250 &&
            element.position.x + 300 >= this.camera._storage.position.x &&
            element.position.y + 250 >= this.camera._storage.position.y
          ) {
            this.scene.renderDom.push(element);

            this.drawRect(
              element.position.x - this.camera._storage.position.x,
              element.position.y - this.camera._storage.position.y,
              8,
              element.isFocus ? 4 : 2,
              element.isFocus ? "rgb(180,44,44)" : "rgb(52,52,52)"
            );
          }
          break;
        }

        case "circle": {
          if (
            this.camera._storage.position.x + this._canvas.width / 2 >
              element.position.x - element.radius &&
            this.camera._storage.position.y + this._canvas.width / 2 >
              element.position.y - element.radius &&
            element.position.x + element.radius >=
              this.camera._storage.position.x &&
            element.position.y + element.radius >=
              this.camera._storage.position.y
          ) {
            this.scene.renderDom.push(element);

            this._context.beginPath();
            this._context.arc(
              element.position.x - this.camera._storage.position.x,
              element.position.y - this.camera._storage.position.y,
              element.radius,
              0,
              2 * Math.PI,
              false
            );
            this._context.fillStyle = element.color;
            this._context.fill();

            this._context.fillStyle = "rgb(0, 0, 0)";
            this._context.font = "16px Arial";
            this._context.fillText(
              `Id: ${element.name}`,
              element.position.x -
                this.camera._storage.position.x -
                element.radius / 2,
              element.position.y - this.camera._storage.position.y
            );
          }

          break;
        }
      }
    }

    this.scene.update = false;
    this.engine.timestamp = timestamp;

    window.requestAnimationFrame((timestamp) => this.update(timestamp));
  }

  run() {
    this.update(0);

    return this;
  }

  static get ratio() {
    let ctx = document.createElement("canvas").getContext("2d"),
      dpr = window.devicePixelRatio || 1,
      bsr =
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1;

    ctx = null;

    return dpr / bsr;
  }

  drawRect(
    x,
    y,
    borderRadius = 6,
    blockLineWidth = 3,
    borderColor = "rgb(52,52,52)"
  ) {
    this._context.beginPath();
    const grd = this._context.createRadialGradient(x, y, 1, x, y, 300);

    grd.addColorStop(0, "red");
    grd.addColorStop(1, "green");

    this._context.roundRect(x, y, 300, 50, [borderRadius, borderRadius, 0, 0]);
    this._context.fillStyle = grd;
    this._context.fill();

    this._context.fillStyle = "rgb(255,255,255)";
    this._context.font = "16px Arial bold";
    this._context.fillText("Event onStart", x + 15, y + 16 + 50 / 4);

    this._context.beginPath();
    this._context.roundRect(x, y + 50, 300, 200, [
      0,
      0,
      borderRadius,
      borderRadius,
    ]);
    this._context.fillStyle = "rgba(112,112,112,0.68)";
    this._context.fill();

    const width = 300;
    const height = 250;

    const top_padding = 100;
    const left_padding = 265;
    const height_t = 20;
    const width_t = 15;

    this._context.beginPath();
    this._context.moveTo(x + left_padding, y + height_t + top_padding);

    this._context.lineTo(x + left_padding, y + top_padding);
    this._context.lineTo(
      x + width_t + left_padding,
      y + height_t / 2 + top_padding
    );

    this._context.lineTo(x + left_padding, y + height_t + top_padding);

    this._context.strokeStyle = "white";

    this._context.lineWidth = 1;
    this._context.stroke();
    this._context.closePath();

    this._context.beginPath();
    this._context.strokeStyle = borderColor;

    this._context.arc(
      x + borderRadius,
      y + borderRadius,
      borderRadius,
      Math.PI,
      (Math.PI * 3) / 2
    );
    this._context.arc(
      x - borderRadius + width,
      y + borderRadius,
      borderRadius,
      (Math.PI * 3) / 2,
      2 * Math.PI
    );
    this._context.arc(
      x - borderRadius + width,
      y - borderRadius + height,
      borderRadius,
      0,
      Math.PI / 2
    );
    this._context.arc(
      x + borderRadius,
      y - borderRadius + height,
      borderRadius,
      Math.PI / 2,
      Math.PI
    );
    this._context.arc(
      x + borderRadius,
      y + borderRadius,
      borderRadius,
      Math.PI,
      (Math.PI * 3) / 2
    );
    this._context.lineWidth = blockLineWidth;
    this._context.stroke();
  }
}
