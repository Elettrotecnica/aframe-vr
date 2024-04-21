/* global AFRAME, THREE */

AFRAME.registerComponent('lightmap', {
  schema: {
    src: {
      type: "map"
    },
    intensity: {
      default: 1
    },
    filter: {
      default: ''
    },
    basis: {
      default: false
    },
    channel: {
      type: 'int',
      default: 1
    }
  },
  init() {
    const src = typeof this.data.src === 'string' ? this.data.src : this.data.src.src;
    const texture = new THREE.TextureLoader().load(src);
    texture.flipY = false;
    texture.channel = this.data.channel;
    this.texture = texture;

    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    const filters = this.data.filter.trim().split(',');
    const sceneEl = this.el.sceneEl;
    this.el.object3D.traverse((o) => {
      if (o.material && filters.some(filter => o.material.name.includes(filter))) {
        o.material.lightMap = this.texture;
        o.material.lightMapIntensity = this.data.intensity;
        o.material.envMap = () => {return sceneEl.object3D.environment};
      }
    });
  }
});

AFRAME.registerComponent('depthwrite', {
  schema: {
    default: true
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        o.material.depthWrite = this.data;
      }
    }.bind(this));
  }
});

AFRAME.registerComponent('hideparts', {
  schema: {
    default: ""
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    const filter = this.data.split(',');
    this.el.object3D.traverse(function (o) {
      if (o.type === 'Mesh' && filter.includes(o.name)) {
        o.visible = false;
      }
    }.bind(this));
  }
});

AFRAME.registerComponent('no-tonemapping', {
  schema: {
    default: ''
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    const filters = this.data.trim().split(',');
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        if (filters.some(filter => o.material.name.includes(filter))) {
          o.material.toneMapped = false;
        }
      }
    }.bind(this));
  }
});
