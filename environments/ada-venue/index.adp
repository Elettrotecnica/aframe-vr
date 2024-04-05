<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
// Make the cheap windows look okay
AFRAME.registerComponent('window-replace', {
  schema: {
    default: ''
  },
  init() {
    this.el.addEventListener('object3dset', this.update.bind(this));
    this.materials = new Map();
  },
  update() {
    const filters = this.data.trim().split(',');
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        if (filters.some(filter => o.material.name.includes(filter))) {
          o.renderOrder = 1;
          const m = o.material;
          const sceneEl = this.el.sceneEl;
          o.material = this.materials.has(m) ?
            this.materials.get(m) :
            new THREE.MeshPhongMaterial({
              name: 'window_' + m.name,
              lightMap: m.lightmap || null,
              lightMapIntensity: m.lightMapIntensity,
              shininess: 90,
              color: '#ffffff',
              emissive: '#999999',
              emissiveMap: m.map,
              transparent: true,
              depthWrite: false,
              map: m.map,
              transparent: true,
              side: THREE.DoubleSide,
              get envMap() {return sceneEl.object3D.environment},
              combine: THREE.MixOperation,
              reflectivity: 0.6,
              blending: THREE.CustomBlending,
              blendEquation: THREE.MaxEquation,
              toneMapped: m.toneMapped
            });
          ;
          window.mat = o.material;
          this.materials.set(m, o.material);
        }
      }
    }.bind(this));
  }
});
</script>
<a-scene
  reflection="directionalLight:#dirlight;"
  renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
  >
  <a-assets>
    <a-asset-item id="venue-physics" src="models/venue-physics.glb"></a-asset-item>
    <a-asset-item id="venue" src="models/venue.glb"></a-asset-item>
    <a-asset-item id="navmesh" src="models/navmesh.glb"></a-asset-item>
    <img id="bake" src="models/venue-lightmap.webp">
    <img id="ball-texture" src="models/ball.jpg">
    <audio id="desert-loop" src="audio/desert-loop.mp3"></audio>
    <!-- /Templates -->
  </a-assets>

  <a-light id="dirlight" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

  <a-entity hide-on-enter-ar position="0 -0.2 0" environment="lighting:none;shadow:true;preset: osiris;"></a-entity>

  <a-sound
    src="#desert-loop"
    autoplay="true"
    loop="true"
    position="-0.26 0 -10"
    >
  </a-sound>

  <a-video
    id="stage-screen"
    width="8"
    height="4.5"
    rotation="0 270 0"
    position="16.5 2.9 0.13"
    >
  </a-video>

  <a-sphere
    oacs-networked-entity="permanent: true; properties: position, rotation, scale;"
    id="ball"
    position="-1 3 -1.5"
    radius="0.5"
    bound-to-entity="entity: #venue-model"
    material="src: #ball-texture"
    ammo-body="type: dynamic"
    ammo-shape="type: sphere">
  </a-sphere>

  <a-gltf-model
    src="#venue-physics"
    visible="false"
    ammo-body="type: static"
    ammo-shape="type: mesh">
  </a-gltf-model>

  <a-gltf-model
    class="collision"
    src="#navmesh"
    visible="false">
  </a-gltf-model>

  <a-gltf-model
    id="venue-model"
    src="#venue"
    lightmap="src:#bake;intensity: 1.5; filter:Window,Ceiling,floor;"
    depthwrite="true"
    window-replace="Glass"
    no-tonemapping="Light"
    shadow="cast:false;receive:true;">
  </a-gltf-model>
</a-scene>
