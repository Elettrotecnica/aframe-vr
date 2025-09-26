<script src="https://cdn.jsdelivr.net/gh/Elettrotecnica/aframe-gltf-model-plus@elettrotecnica/dist/gltf-model-plus.min.js"></script>
<a-scene>
  <a-assets>
    <a-asset-item id="room" src="models/MozAtrium.glb"></a-asset-item>
  </a-assets>

  <a-entity
    gltf-model-plus="#room"
    class="environment-settings"
    rapier-body="type: Fixed"
    rapier-shape="shape: TriMesh"
    ></a-entity>

</a-scene>
