<a-scene
  renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
  >
  <a-assets>
    <a-asset-item id="environment" src="models/CudilleroDiorama.glb"></a-asset-item>
    <a-asset-item id="navmesh" src="models/CudilleroDioramaNavMesh.glb"></a-asset-item>
    <img id="sky" src="images/sky.jpg"/>
    <audio id="waves" src="audio/waves.m4a"></audio>
    <audio id="waves-and-seagulls" src="audio/waves-and-seagulls.m4a"></audio>
    <audio id="restaurant" src="audio/restaurant.m4a"></audio>
    <audio id="shop" src="audio/photo-shop.m4a"></audio>
    <audio id="shore" src="audio/shore.m4a"></audio>
    <audio id="florist" src="audio/florist.m4a"></audio>
  </a-assets>

  <a-sky src="#sky" rotation="0 90 0"></a-sky>

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
