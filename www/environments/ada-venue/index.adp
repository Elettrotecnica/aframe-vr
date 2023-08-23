<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <include src="/packages/aframe-vr/lib/header">
    <script src="js/aframe-environment-component.min.js"></script>
    <script src="js/ar-shadow-helper.js"></script>
    <script src="js/model-utils.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/MozillaReality/ammo.js@8bbc0ea/builds/ammo.wasm.js"></script>
    <script src="https://c-frame.github.io/aframe-physics-system/dist/aframe-physics-system.js"></script>
    <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
      AFRAME.registerComponent('venue-physics', {
        init: function() {
          this.el.addEventListener('model-loaded', function () {
            this.setAttribute('ammo-body', 'type: static');
            this.setAttribute('ammo-shape', 'type: mesh');
          });
        }});
    </script>
  </head>
  <body>
    <a-scene
       oacs-networked-scene
       reflection="directionalLight:#dirlight;"
       renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
       shadow="type: pcfsoft"
       physics="driver: ammo"
       >
      <a-assets>
        <a-asset-item id="venue-physics" src="models/venue-physics.glb"></a-asset-item>
        <a-asset-item id="venue" src="models/venue.glb"></a-asset-item>
        <a-asset-item id="navmesh" src="models/navmesh.glb"></a-asset-item>
        <img id="bake" src="models/venue-lightmap.webp">

        <template id="ball">
          <a-sphere
             radius="0.5">
          </a-sphere>
        </template>

        <include src="/packages/aframe-vr/lib/avatars">

        <!-- /Templates -->
      </a-assets>

      <a-light id="dirlight" shadow-camera-automatic="[ar-shadow-helper],#table,#ladder" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

      <a-light id="dirlight" shadow-camera-automatic="[ar-shadow-helper],#table,#ladder" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

      <a-entity hide-on-enter-ar position="0 -0.2 0" environment="lighting:none;shadow:true;preset: osiris;"></a-entity>

      <a-sphere
         oacs-networked-entity="template: #ball; permanent: true"
         id="theball"
         position="-1 3 -1.5"
         radius="0.5"
         ammo-body="type: dynamic"
         ammo-shape="type: sphere">
      </a-sphere>

      <a-gltf-model
         src="#venue-physics"
         visible="false"
         venue-physics="">
      </a-gltf-model>

      <a-gltf-model
         class="collision"
         src="#navmesh"
         visible="false">
      </a-gltf-model>

      <a-gltf-model
         src="#venue"
         lightmap="src:#bake;intensity: 1.5; filter:Window,Ceiling,floor;"
         depthwrite="true"
         window-replace="Glass"
         no-tonemapping="Light"
         shadow="cast:false;receive:true;">
      </a-gltf-model>

      <include src="/packages/aframe-vr/lib/rig">

    </a-scene>
  </body>
</html>
