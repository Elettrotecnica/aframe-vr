<script src="/resources/aframe-vr/js/aframe-environment-component.min.js"></script>
<script src="/resources/aframe-vr/js/aframe-extras.min.js"></script>
<a-scene
  autoplay-on-click
  renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
  >
  <a-assets>
    <a-asset-item id="environment" src="models/CudilleroDiorama.glb"></a-asset-item>
    <a-asset-item id="navmesh" src="models/CudilleroDioramaNavMesh.glb"></a-asset-item>
    <audio id="waves" src="audio/waves.mp3"></audio>
    <audio id="waves-and-seagulls" src="audio/waves-and-seagulls.mp3"></audio>
    <audio id="restaurant" src="audio/restaurant.mp3"></audio>
    <audio id="shop" src="audio/photo-shop.mp3"></audio>
    <audio id="shore" src="audio/shore.mp3"></audio>
    <audio id="florist" src="audio/florist.mp3"></audio>
  </a-assets>

  <a-entity
    environment="skyType: atmosphere; skyColor: #00eeff; preset: none; active: true; seed: 8; horizonColor: #eff9b7; fog: 0.8; ground: none; dressing: none;">
  </a-entity>
  <a-ocean
    width="500"
    depth="500"
    density="400"
    color="#498A95"
    position="0 -3 0">
  </a-ocean>

  <a-sound
    src="#shore"
    autoplay="true"
    loop="true"
    position="-10.39 0.16 -8.56"
    >
  </a-sound>

  <a-sound
    src="#florist"
    autoplay="true"
    loop="true"
    position="8.29 0.4 -13.19"
    >
  </a-sound>

  <a-sound
    src="#shop"
    autoplay="true"
    loop="true"
    position="-1.34 1.63 8.49"
    >
  </a-sound>

  <a-sound
    src="#restaurant"
    autoplay="true"
    loop="true"
    position="13.28 1.62 8.12"
    >
  </a-sound>

  <a-entity
    sound="src: #waves; autoplay: true; positional: false; volume: 0.1"
    >
  </a-entity>

  <a-sound
    src="#waves-and-seagulls"
    autoplay="true"
    loop="true"
    position="1.21 1.34 -0.95"
    >
  </a-sound>

  <a-gltf-model
    class="collision"
    src="#navmesh"
    visible="false">
  </a-gltf-model>

  <a-gltf-model
    src="#environment">
  </a-gltf-model>
</a-scene>
