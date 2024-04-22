<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    //
    // When defined, this function translates references to assets on
    // the model to a different path, e.g. local.
    //
    window.absoluteURLForAsset = (url) => {
        if (url?.startsWith("https://uploads-prod.reticulum.io/files/")) {
            return url.replace(
		"https://uploads-prod.reticulum.io/files/",
		"./"
            );
        } else {
	    return url;
	}
    };
</script>
<script src="/resources/aframe-vr/js/gltf-model-plus.min.js"></script>
<a-scene>
  <a-assets>
    <a-asset-item id="room" src="Outdoor_Festival.glb"></a-asset-item>
  </a-assets>
  <a-entity
    gltf-model-plus="#room"
    class="environment-settings"
    ammo-body="type: static"
    ammo-shape="type: mesh">
  </a-entity>
</a-scene>
