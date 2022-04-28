function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

export class Viewport {
  scene = {
    width: 3000,
    height: 1000,
    // dom: [
    //   {
    //     type: "circle",
    //     position: {
    //       x: 100,
    //       y: 100,
    //     },
    //     color: `rgb(${getRandomArbitrary(0, 255)}, ${getRandomArbitrary(
    //       0,
    //       255
    //     )}, ${getRandomArbitrary(0, 255)})`,
    //     radius: 90,
    //     name: Math.random().toString(36).slice(2, 7),
    //   },
    // ],

    selected: {
      isEnabled: false,
      elementId: null,
    },
    dom: new Array(20).fill(null).map(() => {
      return {
        type: "circle",
        position: {
          x: getRandomArbitrary(100, 1000),
          y: getRandomArbitrary(100, 1000),
        },
        color: `rgb(${getRandomArbitrary(0, 255)}, ${getRandomArbitrary(
          0,
          255
        )}, ${getRandomArbitrary(0, 255)})`,
        radius: 90,
        name: Math.random().toString(36).slice(2, 7),
      };
    }),
    renderDom: [],
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
      console.log("mouse", [
        this.camera._storage.position.x + event.x - this._canvas.offsetLeft,
        this.camera._storage.position.y + event.y - this._canvas.offsetTop,
      ]);

      const element = this.scene.renderDom.findIndex((element, index) => {
        return (
          this.camera._storage.position.x + event.x - this._canvas.offsetLeft >
            element.position.x - element.radius &&
          this.camera._storage.position.x + event.x - this._canvas.offsetLeft <
            element.position.x + element.radius &&
          this.camera._storage.position.y + event.y - this._canvas.offsetTop >
            element.position.y - element.radius &&
          this.camera._storage.position.y + event.y - this._canvas.offsetTop <
            element.position.y + element.radius
        );
      });

      if (element >= 0) {
        this.scene.selected.isEnabled = true;
        this.scene.selected.elementId = element;
      } else {
        this.scene.selected.isEnabled = false;
        this.scene.selected.elementId = null;
      }

      this.camera._storage.focus = {
        isEnabled: true,
        x: event.x,
        y: event.y,
      };
    });

    this._canvas.addEventListener("mousemove", (event) => {
      if (this.camera._storage.focus.isEnabled) {
        const x = this.camera._storage.focus.x - event.x;
        const y = this.camera._storage.focus.y - event.y;

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
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this.scene.renderDom.splice(0);
    this._calculateTimings();

    let elementsOnRender = 0;

    // this.fillBackground();

    for (const [elementId, element] of Object.entries(this.scene.dom)) {
      switch (element.type) {
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
            elementsOnRender += 2;

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

    this._context.fillStyle = "rgb(0, 0, 0)";
    this._context.font = "16px Arial";
    this._context.fillText(
      `Dom: ${this.scene.renderDom.length} | Elements on render: ${elementsOnRender}`,
      10,
      26
    );

    this._context.fillStyle = "rgb(0, 0, 0)";
    this._context.font = "16px Arial";
    this._context.fillText(`Fps: ${this.engine.fps}`, 10, 50);

    if (this.scene.selected.isEnabled) {
      this._context.fillStyle = "rgb(0, 0, 0)";
      this._context.font = "16px Arial";
      this._context.fillText(
        `Selected: ${this.scene.dom[this.scene.selected.elementId].name}`,
        10,
        75
      );
    }

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
}
