<!-- WebGL Transition -->
<script>
  class Sketch {
    constructor(opts) {
      this.scene = new THREE.Scene();
      this.vertex = `varying vec2 vUv;void main() {vUv = uv;gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );}`;
      this.fragment = opts.fragment;
      this.uniforms = opts.uniforms;
      this.renderer = new THREE.WebGLRenderer();
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.width, this.height);
      this.renderer.setClearColor(0xeeeeee, 1);
      this.duration = opts.duration || 1;
      this.debug = opts.debug || false
      this.easing = opts.easing || 'easeInOut'
      this.clicker = document.getElementById("next");
      this.clicker2 = document.getElementById("prev");
      this.container = document.getElementById("slider");
      this.images = JSON.parse(this.container.getAttribute('data-images'));
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.container.appendChild(this.renderer.domElement);
      this.camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.001,
        1000
      );
      this.camera.position.set(0, 0, 2);
      this.time = 0;
      this.current = 0;
      this.textures = [];
      this.paused = true;
      this.initiate(() => {
        console.log(this.textures);
        this.setupResize();
        this.settings();
        this.addObjects();
        this.resize();
        this.clickEvent();
        this.clickEvent2();
        this.play();
      })
    }
    initiate(cb) {
      const promises = [];
      let that = this;
      this.images.forEach((url, i) => {
        let promise = new Promise(resolve => {
          that.textures[i] = new THREE.TextureLoader().load(url, resolve);
        });
        promises.push(promise);
      })
      Promise.all(promises).then(() => {
        cb();
      });
    }
    clickEvent() {
      this.clicker.addEventListener('click', () => {
        this.next();
      })
    }
    clickEvent2() {
      this.clicker2.addEventListener('click', () => {
        this.prev();
      })
    }
    settings() {
      let that = this;
      if (this.debug) this.gui = new dat.GUI();
      this.settings = {
        progress: 0.5
      };
      Object.keys(this.uniforms).forEach((item) => {
        this.settings[item] = this.uniforms[item].value;
        if (this.debug) this.gui.add(this.settings, item, this.uniforms[item].min, this.uniforms[item].max, 0.01);
      })
    }
    setupResize() {
      window.addEventListener("resize", this.resize.bind(this));
    }
    resize() {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      // image cover
      this.imageAspect = this.textures[0].image.height / this.textures[0].image.width;
      let a1;
      let a2;
      if (this.height / this.width > this.imageAspect) {
        a1 = (this.width / this.height) * this.imageAspect;
        a2 = 1;
      } else {
        a1 = 1;
        a2 = (this.height / this.width) / this.imageAspect;
      }
      this.material.uniforms.resolution.value.x = this.width;
      this.material.uniforms.resolution.value.y = this.height;
      this.material.uniforms.resolution.value.z = a1;
      this.material.uniforms.resolution.value.w = a2;
      const dist = this.camera.position.z;
      const height = 1;
      this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist));
      this.plane.scale.x = this.camera.aspect;
      this.plane.scale.y = 1;
      this.camera.updateProjectionMatrix();
    }
    addObjects() {
      let that = this;
      this.material = new THREE.ShaderMaterial({
        extensions: {
          derivatives: "#extension GL_OES_standard_derivatives : enable"
        },
        side: THREE.DoubleSide,
        uniforms: {
          time: {
            type: "f",
            value: 0
          },
          progress: {
            type: "f",
            value: 0
          },
          border: {
            type: "f",
            value: 0
          },
          intensity: {
            type: "f",
            value: 0
          },
          scaleX: {
            type: "f",
            value: 40
          },
          scaleY: {
            type: "f",
            value: 40
          },
          transition: {
            type: "f",
            value: 40
          },
          swipe: {
            type: "f",
            value: 0
          },
          width: {
            type: "f",
            value: 0
          },
          radius: {
            type: "f",
            value: 0
          },
          texture1: {
            type: "f",
            value: this.textures[0]
          },
          texture2: {
            type: "f",
            value: this.textures[1]
          },
          displacement: {
            type: "f",
            value: new THREE.TextureLoader().load('https://uploads-ssl.webflow.com/64db0d55c154912f54bd57b4/6501e7ffba44854e91bf03f3_disp1.jpg')
          },
          resolution: {
            type: "v4",
            value: new THREE.Vector4()
          },
        },
        vertexShader: this.vertex,
        fragmentShader: this.fragment
      });
      this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
      this.plane = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.plane);
    }
    stop() {
      this.paused = true;
    }
    play() {
      this.paused = false;
      this.render();
    }
    next() {
      if (this.isRunning) return;
      this.isRunning = true;
      let len = this.textures.length;
      let nextTexture = this.textures[(this.current + 1) % len];
      this.material.uniforms.texture2.value = nextTexture;
      let tl = new TimelineMax();
      tl.to(this.material.uniforms.progress, this.duration, {
        value: 1,
        ease: Power2[this.easing],
        onComplete: () => {
          console.log('FINISH');
          this.current = (this.current + 1) % len;
          this.material.uniforms.texture1.value = nextTexture;
          this.material.uniforms.progress.value = 0;
          this.isRunning = false;
        }
      })
    }
    prev() {
      if (this.isRunning) return;
      this.isRunning = true;
      let len = this.textures.length;
      const prevIndex = this.current === 0 ? len - 1 : this.current - 1;
      let prevTexture = this.textures[prevIndex];
      this.material.uniforms.texture2.value = prevTexture;
      let tl = new TimelineMax();
      tl.to(this.material.uniforms.progress, this.duration, {
        value: 1,
        ease: Power2[this.easing],
        onComplete: () => {
          console.log('FINISH');
          this.current = prevIndex;
          this.material.uniforms.texture1.value = prevTexture;
          this.material.uniforms.progress.value = 0;
          this.isRunning = false;
        }
      })
    }
    render() {
      if (this.paused) return;
      this.time += 0.05;
      this.material.uniforms.time.value = this.time;
      Object.keys(this.uniforms).forEach((item) => {
        this.material.uniforms[item].value = this.settings[item];
      });
      requestAnimationFrame(this.render.bind(this));
      this.renderer.render(this.scene, this.camera);
    }
  }
</script>

<script>
  let sketch = new Sketch({
    duration: 1.5,
    debug: false,
    easing: 'easeOut',
    uniforms: {
      width: {
        value: 0.5,
        type: 'f',
        min: 0,
        max: 10
      },
    },
    fragment: `
		uniform float time;
		uniform float progress;
		uniform sampler2D texture1;
		uniform sampler2D texture2;
		uniform vec4 resolution;

		varying vec2 vUv;
		varying vec4 vPosition;


		void main()	{
			vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
			vec2 p = newUV;
			float x = progress;
			x = smoothstep(.0,1.0,(x*2.0+p.y-1.0));
			vec4 f = mix(
				texture2D(texture1, (p-.5)*(1.-x)+.5), 
				texture2D(texture2, (p-.5)*x+.5), 
				x);
			gl_FragColor = f;
		}
	`
  });
</script>
