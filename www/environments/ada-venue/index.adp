<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <include src="/packages/aframe-vr/lib/header">
    <script src="js/aframe-environment-component.min.js"></script>
    <script src="js/ar-shadow-helper.js"></script>
    <script src="js/model-utils.js"></script>
  </head>
  <body>
    <a-scene
       oacs-networked-scene
       reflection="directionalLight:#dirlight;"
       renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
       shadow="type: pcfsoft"
       >
      <a-assets>
        <a-asset-item id="venue" src="models/venue.glb"></a-asset-item>
        <a-asset-item id="navmesh" src="models/navmesh.glb"></a-asset-item>
        <img id="bake" src="models/venue-lightmap.webp">

        <include src="/packages/aframe-vr/lib/avatars">

        <!-- /Templates -->
      </a-assets>

      <a-light id="dirlight" shadow-camera-automatic="[ar-shadow-helper],#table,#ladder" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

      <a-entity hide-on-enter-ar position="0 -0.2 0" environment="lighting:none;shadow:true;preset: osiris;"></a-entity>

      <a-gltf-model class="collision" src="#navmesh" visible="false"></a-gltf-model>
      <a-gltf-model
         src="#venue"
         lightmap="src:#bake;intensity: 1.5; filter:Window,Ceiling,floor;"
         depthwrite="true"
         window-replace="Glass"
         no-tonemapping="Light"
         shadow="cast:false;receive:true;"
         ></a-gltf-model>

      <include src="/packages/aframe-vr/lib/rig">

    </a-scene>
  </body>
</html>
