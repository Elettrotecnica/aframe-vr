<%
  security::csp::require script-src c-frame.github.io
  security::csp::require connect-src cdn.jsdelivr.net
%>
<script src="js/aframe-environment-component.min.js"></script>
<script src="js/ar-shadow-helper.js"></script>
<script src="js/model-utils.js"></script>
<script src="https://cdn.jsdelivr.net/gh/MozillaReality/ammo.js@8bbc0ea/builds/ammo.wasm.js"></script>
<script src="https://c-frame.github.io/aframe-physics-system/dist/aframe-physics-system.js"></script>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    window.addEventListener('load', function () {
	const scene = document.querySelector('a-scene');
        //
        // When objects requiring physics finish to load, attach physics to them
        //
	scene.addEventListener('model-loaded', function (e) {
	    if (e.target.getAttribute('src') === '#venue-physics') {
		//
		// The static body modeling the room
		//
		e.target.setAttribute('ammo-body', 'type: static');
		e.target.setAttribute('ammo-shape', 'type: mesh');
	    } else if (e.target.hasAttribute('data-spawn')) {
		//
		// Objects spawned by peers
		//
		const spawn = e.target.getAttribute('data-spawn');
		const type = spawn === 'mine' ? 'type: dynamic' : 'type: kinematic; emitCollisionEvents: true';
		e.target.setAttribute('ammo-body', type);
		e.target.setAttribute('ammo-shape', 'type: sphere');
	    }
	});

	scene.addEventListener('collidestart', function (e) {
            if (e.target.matches('#ball, [data-spawn]') && e.detail.targetEl.matches('a-camera, [hand-controls]')) {
                e.target.components['oacs-networked-entity'].networkedScene.grab(e.target.id);
            }
        });

	//
	// Switch entities physics when they are grabbed/released from
	// dynamic (local) to kinematic (remote).
	//
	function switchBodyType(e, type) {
	    const shape = e.getAttribute('ammo-shape');
	    if (e.components['ammo-body'].addedToSystem) {
		e.removeAttribute('ammo-shape');
                e.removeAttribute('ammo-body');
	    }
            e.setAttribute('ammo-body', type);
	    e.setAttribute('ammo-shape', shape);
	}
	scene.addEventListener('release', function (e) {
	    if (e.target.components['ammo-body'] &&
		e.target.components['ammo-shape'] &&
		e.target.components['ammo-body'].data.type === 'dynamic') {
		switchBodyType(e.target, 'type: kinematic; emitCollisionEvents: true');
	    }
	});
	scene.addEventListener('grab', function (e) {
	    if (e.target.components['ammo-body'] &&
		e.target.components['ammo-shape'] &&
		e.target.components['ammo-body'].data.type === 'kinematic') {
		switchBodyType(e.target, 'type: dynamic');
	    }
	});

        //
        // Make our local avatar a kinematic body
        //
        const camera = document.querySelector('a-camera');
        camera.setAttribute('ammo-body', 'type: kinematic');
        camera.setAttribute('ammo-shape', 'type: sphere; fit: manual; sphereRadius: 1.0');

        //
        // Once controllers connect, make them a kinematic body.
        //
        for (const hand of document.querySelectorAll('[hand-controls]')) {
            hand.addEventListener('controllerconnected', function () {
                this.setAttribute('ammo-body', 'type: kinematic');
                this.setAttribute('ammo-shape', 'type: sphere');
            }, {once: true });
        }
    });
</script>
<a-scene
  reflection="directionalLight:#dirlight;"
  renderer="alpha:true;physicallyCorrectLights:true;colorManagement:true;exposure:2;toneMapping:ACESFilmic;"
  shadow="type: pcfsoft"
  physics="driver: ammo; debug: false"
  >
  <a-assets>
    <a-asset-item id="venue-physics" src="models/venue-physics.glb"></a-asset-item>
    <a-asset-item id="venue" src="models/venue.glb"></a-asset-item>
    <a-asset-item id="navmesh" src="models/navmesh.glb"></a-asset-item>
    <img id="bake" src="models/venue-lightmap.webp">
    <img id="ball-texture" src="models/ball.jpg">
    <!-- /Templates -->
  </a-assets>

  <a-light id="dirlight" shadow-camera-automatic="[ar-shadow-helper],#table,#ladder" intensity="0.8" light="castShadow:true;type:directional" position="0 3 -6"></a-light>

  <a-entity hide-on-enter-ar position="0 -0.2 0" environment="lighting:none;shadow:true;preset: osiris;"></a-entity>

  <a-sphere
    oacs-networked-entity="permanent: true"
    id="ball"
    position="-1 3 -1.5"
    radius="0.5"
    material="src: #ball-texture"
    ammo-body="type: dynamic"
    ammo-shape="type: sphere">
  </a-sphere>

  <a-gltf-model
    src="#venue-physics"
    visible="false">
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
</a-scene>