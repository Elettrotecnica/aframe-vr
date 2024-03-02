<script src="/aframe-vr/resources/js/aframe-environment-component.min.js"></script>
<script src="/aframe-vr/resources/js/ar-shadow-helper.js"></script>
<script src="/aframe-vr/resources/js/model-utils.js"></script>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    window.addEventListener('load', function () {
	const scene = document.querySelector('a-scene');
	scene.addEventListener('collidestart', function (e) {
            if (e.target.id === 'ball' && e.detail.targetEl.hasAttribute('standard-hands')) {
                e.target.components['oacs-networked-entity'].networkedScene.grab(e.target.id);
            }
        });
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
    <audio id="desert-loop" src="audio/desert-loop.m4a"></audio>
    <!-- /Templates -->
  </a-assets>

  <a-light id="dirlight" shadow-camera-automatic="[ar-shadow-helper],#table,#ladder" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

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
