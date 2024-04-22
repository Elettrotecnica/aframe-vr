<script src="/resources/aframe-vr/js/gltf-model-plus.min.js"></script>
<a-scene>
  <a-assets>
    <a-asset-item id="room" src="models/MozAtrium.glb"></a-asset-item>
  </a-assets>

  <a-entity
    gltf-model-plus="#room"
    class="environment-settings"
    ammo-body="type: static"
    ammo-shape="type: mesh"
    ></a-entity>

</a-scene>
