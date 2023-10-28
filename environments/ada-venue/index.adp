<%
  security::csp::require connect-src cdn.jsdelivr.net
%>
<script src="js/aframe-environment-component.min.js"></script>
<script src="js/ar-shadow-helper.js"></script>
<script src="js/model-utils.js"></script>
<script src="https://cdn.jsdelivr.net/gh/MozillaReality/ammo.js@8bbc0ea/builds/ammo.wasm.js"></script>
<script src="/aframe-vr/resources/js/aframe-physics-system.js"></script>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    window.addEventListener('load', function () {

	const scene = document.querySelector('a-scene');
        //
        // When objects requiring physics finish to load, attach physics to them
        //
	scene.addEventListener('model-loaded', function (e) {
	    if (e.target.hasAttribute('data-spawn')) {
		//
		// Objects spawned by peers
		//
		const spawn = e.target.getAttribute('data-spawn');
		const type = spawn === 'mine' ? 'type: dynamic' : 'type: kinematic; emitCollisionEvents: true';
		e.target.setAttribute('ammo-body', type);
	        e.target.setAttribute('ammo-shape', 'type: hull');
		e.target.setAttribute('bound-to-entity', 'entity: #venue-model');
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


        if (window.AFRAME.utils.device.checkHeadsetConnected()) {
            //
            // Once controllers connect, make them a kinematic body and
            // let them grab stuff.
            //
            for (const hand of document.querySelectorAll('[hand-controls]')) {
                hand.addEventListener('controllerconnected', function () {
                    this.setAttribute('ammo-body', 'type: kinematic; emitCollisionEvents: true');
                    this.setAttribute('ammo-shape', 'type: sphere');
                    this.setAttribute('grab', '');
                }, {once: true });
            }
        } else {
            //
            // Avatars from the browser will behave as a kinematic
            // body when they are in VR mode.
            //
            const camera = document.querySelector('a-camera');
            window.addEventListener('enter-vr', function (e) {
                camera.setAttribute('ammo-body', 'type: kinematic');
                camera.setAttribute('ammo-shape', 'type: sphere; fit: manual; sphereRadius: 1.6');
            });
            window.addEventListener('exit-vr', function (e) {
	        camera.removeAttribute('ammo-shape');
                camera.removeAttribute('ammo-body');
            });
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

  <a-sphere
    oacs-networked-entity="permanent: true"
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
