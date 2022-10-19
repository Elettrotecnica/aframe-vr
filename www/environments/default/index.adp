<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Hello, WebVR! • A-Frame</title>
    <meta name="description" content="Hello, WebVR! • A-Frame">
    <include src="/packages/aframe-vr/lib/header">
  </head>
  <body>
    <a-scene oacs-networked-scene>
      <a-assets>
        <img src="images/grid.png" id="grid">
        <img id="sky" src="images/sky.png"/>
        <img id="boxTexture" src="images/mYmmbrp.jpg">

        <a-asset-item id="building-rectangular-sloped"
                      src="models/building_-_rectangular_-_sloped_top/scene.gltf"></a-asset-item>
        <a-asset-item id="building-square-steeple-top"
                      src="models/building_-_square_-_steeple_top/scene.gltf"></a-asset-item>
        <a-asset-item id="building-stretched-octagonal-tier"
                      src="models/building_-_stretched_octagonal_-_tier/scene.gltf"></a-asset-item>

        <include src="/packages/aframe-vr/lib/avatars">

        <template id="box-template">
          <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
        </template>
        <!-- /Templates -->
      </a-assets>

      <a-entity
        geometry="primitive: plane; width: 10000; height: 10000;" rotation="-90 0 0"
        material="src: #grid; repeat: 10000 10000; transparent: true;metalness:0.6; roughness: 0.4; sphericalEnvMap: #sky;"></a-entity>

      <a-entity light="color: #ccccff; intensity: 1; type: ambient;" visible=""></a-entity>
      <a-entity light="color: ffaaff; intensity: 1.5" position="5 5 5"></a-entity>
      <a-entity light="color: white; intensity: 0.5" position="-5 5 15"></a-entity>
      <a-entity light="color: white; type: ambient;"></a-entity>

      <a-box src="#boxTexture" position="-11 2 -5" rotation="0 45 45" scale="2 2 2"
         animation="property: object3D.position.y; to: 5; dir: alternate; dur: 2000; loop: true; clockSynced: true"></a-box>

      <a-entity scale="0.005 0.005 0.005" position="-0 0 -35" id="building-1" gltf-model="#building-rectangular-sloped"></a-entity>
      <a-entity scale="0.005 0.005 0.005" position="-20 0 -35" id="building-2" gltf-model="#building-square-steeple-top"></a-entity>
      <a-entity scale="0.005 0.005 0.005" position="-40 0 -35" id="building-3" gltf-model="#building-stretched-octagonal-tier"></a-entity>
      <a-entity scale="0.005 0.005 0.005" position="20 0 -35" id="building-1" gltf-model="#building-rectangular-sloped"></a-entity>
      <a-entity scale="0.005 0.005 0.005" position="40 0 -35" id="building-2" gltf-model="#building-square-steeple-top"></a-entity>
      <a-entity scale="0.005 0.005 0.005" position="60 0 -35" id="building-3" gltf-model="#building-stretched-octagonal-tier"></a-entity>

      <a-sky src="#sky" rotation="0 -90 0"></a-sky>

      <include src="/packages/aframe-vr/lib/rig">

    </a-scene>
  </body>
</html>
