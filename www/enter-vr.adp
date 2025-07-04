<master src="/www/blank-master">
  <property name="doc(title)">Enter VR</property>

  <template id="extra-assets">
    <if @painting_p;literal@ true>
      <img id="uinormal"
           src="/resources/aframe-vr/assets/images/ui-normal.png"
           crossorigin="anonymous">
      <a-asset-item id="uiobj"
                    src="/resources/aframe-vr/assets/models/ui.obj"></a-asset-item>
      <a-asset-item id="tipObj"
                    src="/resources/aframe-vr/assets/models/controller-tip.glb"></a-asset-item>
      <audio crossorigin="anonymous"
             id="ui_click0"
             src="https://cdn.aframe.io/a-painter/sounds/ui_click0.ogg"></audio>
      <audio crossorigin="anonymous"
             id="ui_click1"
             src="https://cdn.aframe.io/a-painter/sounds/ui_click1.ogg"></audio>
      <audio crossorigin="anonymous"
             id="ui_menu"
             src="https://cdn.aframe.io/a-painter/sounds/ui_menu.ogg"></audio>
      <audio crossorigin="anonymous"
             id="ui_undo"
             src="https://cdn.aframe.io/a-painter/sounds/ui_undo.ogg"></audio>
      <audio crossorigin="anonymous"
             id="ui_tick"
             src="https://cdn.aframe.io/a-painter/sounds/ui_tick.ogg"></audio>
      <audio crossorigin="anonymous"
             id="ui_paint"
             src="https://cdn.aframe.io/a-painter/sounds/ui_paint.ogg"></audio>
    </if>
    <if @spawn_objects_p;literal@ true>
      <include src="/packages/aframe-vr/lib/models" format="assets"/>
    </if>
  </template>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    window.addEventListener('DOMContentLoaded', () => {
	const scene = document.querySelector('a-scene');

	//
	// Extend the assets on the scene with additional ones needed to
	// support features such as painting or model spawning.
	//
	let assets = document.querySelector('a-assets');
	if (!assets) {
	    assets = document.createElement('a-assets');
	    scene.appendChild(assets);
	}
	assets.innerHTML += document.querySelector('#extra-assets').innerHTML;

	//
	// Set attributes on the scene
	//
	const wsURI = `wsURI: ${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/aframe-vr/connect/@package_id@`;
	scene.setAttribute('oacs-networked-scene', wsURI);
	scene.setAttribute('webxr', 'overlayElement:#toolbar;');
	scene.setAttribute('xr-mode-ui', 'enabled: false;');

	//
	// Append our rig to the scene
	//
	scene.insertAdjacentHTML('beforeend', document.querySelector('#vr-rig').innerHTML);

        //
        // HTML UI should not occlude transparent materials.
        //
        for (const htmlUI of scene.querySelectorAll('a-entity[html]')) {
            htmlUI.addEventListener('object3dset', function (evt) {
                if (evt.detail.type === 'html') {
                    const mesh = evt.detail.object;
                    mesh.material.alphaHash = true;
                }
            });
        }
    });
  </script>

  <include src="/packages/aframe-vr/environments/@environment;literal@/index"/>

  <if @avatar_p;literal@ true>
    <!-- Avatar -->
    <template id="avatar-template-@user_id;literal@">
      <a-entity position="0 1.6 -3"
		class="avatar"
		readyplayerme-avatar="model: url(@avatar_url@); lookAt: a-camera, [oacs-networked-entity]">
	<a-text data-name="value"
		value=""
		material="color: white"
		geometry="primitive: plane; width: auto; height: auto"
		color="black"
		align="center"
		width="1"
		position="0 -0.4 -0.5"
		rotation="0 180 0"></a-text>
      </a-entity>
    </template>
  </if>
  <else>
    <template id="avatar-template-@user_id;literal@">
      <a-entity class="avatar" scale="0.5 0.5 0.5" shadow>
	<a-sphere data-color
		  class="head"
		  color="#ffffff"
		  scale="0.45 0.5 0.4">
	</a-sphere>
	<a-entity class="face"
		  position="0 0.05 0">
	  <a-sphere class="eye"
		    color="#efefef"
		    position="0.16 0.1 -0.35"
		    scale="0.12 0.12 0.12">
	    <a-sphere class="pupil"
		      color="#000"
		      position="0 0 -1"
		      scale="0.2 0.2 0.2">
	    </a-sphere>
	  </a-sphere>
	  <a-sphere class="eye"
		    color="#efefef"
		    position="-0.16 0.1 -0.35"
		    scale="0.12 0.12 0.12">
	    <a-sphere class="pupil"
		      color="#000"
		      position="0 0 -1"
		      scale="0.2 0.2 0.2">
	    </a-sphere>
	  </a-sphere>
	  <a-text data-name="value"
		  value=""
		  material="color: white"
		  geometry="primitive: plane; width: auto; height: auto"
		  color="black"
		  align="center"
		  width="1"
		  position="0 -0.4 -0.5"
		  rotation="0 180 0">
	  </a-text>
	</a-entity>
      </a-entity>
    </template>
  </else>

  <template id="avatar-left-hand-@user_id;literal@">
    <a-entity
      remote-hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
      <if @painting_p;literal@ true>
        brush="hand: left; owner: client-@user_id;literal@;"
        paint-controls="hand: left;  controller: default; tooltips: false; hideController: true;"
      </if>
      ></a-entity>
  </template>
  <template id="avatar-right-hand-@user_id;literal@">
    <a-entity
      remote-hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
      <if @painting_p;literal@ true>
        brush="hand: right; owner: client-@user_id;literal@;"
        paint-controls="hand: right; controller: default; tooltips: false; hideController: true;"
      </if>
      ></a-entity>
  </template>

  <template id="vr-rig">
    <a-entity id="cameraRig" move-to-spawn-point>
      <!-- camera -->
      <a-camera id="client-@user_id;literal@"
                simple-navmesh-constraint="navmesh:.navmesh; fall:0.5; height:1.6; exclude:.navmesh-hole;"
                oacs-networked-entity="template: #avatar-template-@user_id;literal@; name: @username@; randomColor: true"
		<if @webrtc_p;literal@ true>
		  janus-videoroom-entity="room: @janus_room@; URI: @janus_url@; pin: @janus_room_pin@"
		</if>>
      </a-camera>
      <!-- hand controls -->
      <a-entity id="client-@user_id;literal@-left-hand"
		blink-controls="rotateOnTeleport:false; cameraRig: #cameraRig; teleportOrigin: a-camera; collisionEntities: .navmesh; startEvents: aim; endEvents: teleport;"
		hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
                <if @painting_p;literal@ true>
                  standard-painting="owner: client-@user_id;literal@; active: false;"
                </if>
		oacs-networked-entity="template: #avatar-left-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture,<if @painting_p;literal@ true>brush, paint-controls</if>">
	<a-sphere color="black"
		  radius="0.005"
		  id="cursor"
		  material="shader:flat"></a-sphere>
	<a-entity html="cursor:#cursor;html:#toolbar"
		  position="-0.142 -0.0166 -0.02928"
		  rotation="-80 90 0"
		  scale="0.5 0.5 0.5"></a-entity>
	<!-- Kept around because one day I want to enable switching of the menu hand -->
	<!-- <a-entity cursor -->
	<!--           raycaster="showLine: false; far: 0.6; lineColor: black; objects: [html]; interval:100;" -->
	<!--           rotation="-90 0 90"></a-entity> -->
      </a-entity>
      <a-entity id="client-@user_id;literal@-right-hand"
		blink-controls="rotateOnTeleport:false; cameraRig: #cameraRig; teleportOrigin: a-camera; collisionEntities: .navmesh; startEvents: aim; endEvents: teleport;"
		hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
                <if @painting_p;literal@ true>
                  standard-painting="owner: client-@user_id;literal@; active: false;"
                </if>
		oacs-networked-entity="template: #avatar-right-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture,<if @painting_p;literal@ true>brush, paint-controls</if>">
	<a-entity cursor
		  raycaster="showLine: false; far: 0.6; lineColor: black; objects: [html]; interval:100;"
		  rotation="-90 0 90"></a-entity>
      </a-entity>
    </a-entity>
  </template>

  <div id="toolbar">
    <div class="w3-sidebar w3-bar-block w3-light-grey w3-card" style="width:130px; height: max-content;">
      <h5 class="w3-bar-item">Menu</h5>
      <button class="w3-bar-item w3-button tablink w3-dark-grey" data-menu="room">Room</button>
      <button class="w3-bar-item w3-button tablink" data-menu="connection">Connection</button>
      <if @webrtc_p;literal@ true>
	<button class="w3-bar-item w3-button tablink" data-menu="audio">Audio</button>
      </if>
      <if @spawn_objects_p;literal@ true>
	<button class="w3-bar-item w3-button tablink" data-menu="models">Models</button>
      </if>
      <if @chat_p;literal@ true>
	<button class="w3-bar-item w3-button tablink" data-menu="chat">Chat</button>
      </if>
      <if @painting_p;literal@ true>
        <button class="w3-bar-item w3-button tablink" data-menu="paint">Paint</button>
      </if>
    </div>

    <div id="vr-menu" style="background-color: white; margin-left:130px; width: max-content; max-width: calc(100vw - 170px); height: max-content;">

      <div data-menu="room">
	<div class="w3-container w3-teal w3-light-grey">
	  <h2>Room</h2>
	</div>
	<div class="w3-panel">
	  <a id="enter-vr"
	     class="w3-button w3-green w3-hover-green w3-margin-bottom">Enter VR</a>
	  <br>
	  <a id="return-to-main-menu" class="w3-button w3-red w3-hover-red w3-margin-bottom"
	     href="@package_url@">Return to Main Menu</a>
	</div>
      </div>

      <div data-menu="connection" style="display:none">
	<div class="w3-container w3-teal w3-light-grey">
	  <h2>Connection</h2>
	</div>
	<div class="w3-panel">
	  <table>
	    <tr>
	      <td>Websocket:</td><td><span id="websocket-connection-status"></span></td>
	    </tr>
	    <if @webrtc_p;literal@ true>
	      <tr>
		<td>WebRTC:</td><td><span id="webrtc-connection-status"></span></td>
	      </tr>
	    </if>
	  </table>
	</div>
      </div>

      <if @webrtc_p;literal@ true>
	<div data-menu="audio" style="display:none">
	  <div class="w3-container w3-teal w3-light-grey">
	    <h2>Audio</h2>
	  </div>
	  <div class="w3-panel w3-border" id="webrtc-status"></div>
	  <div id="audiometer" class="w3-panel w3-center" style="display:none;">
	    <div>
	      <button id="mutebutton" class="w3-button w3-amber">Mute</button>
	    </div>
	    <div style="margin-left: auto; margin-right: auto; width:25px; height:150px;" class="w3-red">
	      <div id="audio-level" class="w3-black"></div>
	    </div>
	    <div class="checkbox">
	      <label>
		<input type="checkbox" id="pushtotalk">Use PushToTalk
		<audio id="pushtotalk-audio" style="display: none;" src="/aframe-vr/resources/audio/roger.mp3"></audio>
	      </label>
	    </div>
	  </div>
	</div>
      </if>

      <if @spawn_objects_p;literal@ true>
	<div data-menu="models" style="display:none">
	  <div class="w3-container w3-teal w3-light-grey">
	    <h2>Models</h2>
	  </div>
	  <div class="w3-panel">
	    <ul class="w3-ul w3-border w3-margin-bottom"></ul>
	  </div>
	</div>
      </if>

      <if @chat_p;literal@ true>
	<div data-menu="chat" style="display:none; min-width: calc(50vw - 170px);">
	  <div class="w3-container w3-teal w3-light-grey">
	    <h2>Chat</h2>
	  </div>
	  <div class="w3-panel">
	    <include src="/packages/chat/lib/chat" room_id="@chat_room_id;literal@">
	  </div>
	</div>
      </if>

      <if @painting_p;literal@ true>
	<div data-menu="paint" style="display:none;">
	  <div class="w3-container w3-teal w3-light-grey">
	    <h2>Paint</h2>
	  </div>
	  <div class="w3-panel">
	    <button id="toggle-painting" class="w3-button w3-green w3-hover-green w3-margin-bottom">
              Start Painting
            </button>
          </div>
	</div>
      </if>

    </div>
  </div>

  <if @painting_p;literal@ false>
    <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
      //
      // a-painter comes with its own input mappings. We we do not
      // paint, we map aiming and teleporting the same as they do for
      // consistency.
      //
      const mappings = {
	behaviours: {},
	mappings: {
	  movement: {
	    common: {},

	    'vive-controls': {
	      // Teleport
	      'trackpad.down': 'aim',
	      'trackpad.up': 'teleport'
	    },

	    'oculus-touch-controls': {
	      // Teleport
	      'ybutton.down': 'aim',
	      'ybutton.up': 'teleport',

	      'bbutton.down': 'aim',
	      'bbutton.up': 'teleport'
	    },

	    'pico-controls': {
	      // Teleport
	      'ybutton.down': 'aim',
	      'ybutton.up': 'teleport',

	      'bbutton.down': 'aim',
	      'bbutton.up': 'teleport'
	    },

	    'windows-motion-controls': {
	      // Teleport
	      'trackpad.down': 'aim',
	      'trackpad.up': 'teleport'
	    },
	  }
	}
      };

      document.querySelector('a-scene').addEventListener('loaded', function() {
	AFRAME.registerInputMappings(mappings);
	AFRAME.currentInputMapping = 'movement';
      });
    </script>
  </if>

  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    function renderConnectionStatus(element, statusEvent) {
	let status;
	element.classList.remove(
	    'w3-pale-green',
	    'w3-pale-yellow',
	    'w3-pale-red'
	);
	switch (statusEvent.detail.level) {
	case 'success':
	    element.classList.add('w3-pale-green');
	    status = 'Online';
	    break;
	case 'warning':
	    element.classList.add('w3-pale-yellow');
	    status = 'Connecting...';
	    break;
	case 'danger':
	    element.classList.add('w3-pale-red');
	    status = 'Offline';
	    break;
	}
	element.textContent = status;
    }

    const vrScene = document.querySelector('a-scene');

    vrScene.addEventListener('loaded', () => {
	const websocketConnectionStatusElement = document.querySelector('#websocket-connection-status');
	vrScene.addEventListener('connectionstatuschange', function (e) {
	    renderConnectionStatus(websocketConnectionStatusElement, e);
	});

	function getVRMenu(name) {
	    return document.querySelector(`#vr-menu [data-menu='${name}']`);
	}

	//
	// Switch to a different menu whenever the button is clicked in the
	// toolbar.
	//
	for (const l of document.querySelectorAll('#toolbar .tablink')) {
	    l.addEventListener('click', function (e) {
		const menuSelected = document.querySelector('#toolbar .tablink.w3-dark-grey');
		menuSelected.classList.remove('w3-dark-grey');
		getVRMenu(menuSelected.dataset.menu).style.display = 'none';
		this.classList.add('w3-dark-grey');
		getVRMenu(this.dataset.menu).style.display = 'block';
	    });
	}

	const enterVRButton = document.querySelector('#enter-vr');
	enterVRButton.addEventListener('click', function (e) {
	    if (vrScene.is('vr-mode')) {
		vrScene.exitVR();
	    } else {
		vrScene.enterVR();
	    }
	});
	window.addEventListener('enter-vr', function (e) {
	    enterVRButton.textContent = 'Exit VR';
	    enterVRButton.classList.replace('w3-green', 'w3-amber');
	    enterVRButton.classList.replace('w3-hover-green', 'w3-hover-amber');
	});
	window.addEventListener('exit-vr', function (e) {
	    enterVRButton.textContent = 'Enter VR';
	    enterVRButton.classList.replace('w3-amber', 'w3-green');
	    enterVRButton.classList.replace('w3-hover-amber', 'w3-hover-green');
	});

	//
	// When we return to the main menu from inside of immersive mode,
	// exit the immersive mode first to improve the comfort.
	//
	document.querySelector('#return-to-main-menu').addEventListener('click', function (e) {
	    if (vrScene.is('vr-mode')) {
		vrScene.exitVR();
	    }
	});

      <if @chat_p;literal@ true>

	//
	// Update the HTMLMesh when the chat messages are scrolled
	//
	document.querySelector('#xowiki-chat-messages')?.addEventListener('scroll', function (e) {
	    this.classList.toggle('scrolled');
	});

	//
	// Writing chat messages in immersive mode is not supported, at
	// least for now. We hide/display the chat text field when
	// entering/leaving VR.
	//
	const chatMessageForm = document.querySelector('#xowiki-chat-messages-form-block');
	window.addEventListener('enter-vr', function (e) {
	    if (chatMessageForm) {chatMessageForm.style.display = 'none';}
	});
	window.addEventListener('exit-vr', function (e) {
	    if (chatMessageForm) {chatMessageForm.style.display = null;}
	});

      </if>
      <if @spawn_objects_p;literal@ true>
	//
	// Whenever the models menu becomes visible, fetch the models from
	// the JSON endpoint and display the spawning UI
	//
	const targetNode = getVRMenu('models');
	const modelsList = targetNode.querySelector('ul');
	const config = { attributes: true };
	const callback = (mutationList, observer) => {
	    if (targetNode.style.display === 'none') {
		return;
	    }
	    modelsList.innerHTML = '';
	    const xml = new XMLHttpRequest();
	    xml.responseType = 'json';
	    xml.addEventListener('load', e => {
		for (const m of xml.response) {
		    const template = `
		      <li>
			<span class="spawn-controls"
			      data-id="spawn-${m.live_revision}"
			      data-model_url="${m.download_url}">
			  <button class="w3-button w3-green w3-hover-green"
                                  data-class-spawn="w3-button w3-green w3-hover-green"
                                  data-text-spawn="Spawn"
                                  data-class-despawn="w3-button w3-red w3-hover-red"
                                  data-text-despawn="Despawn">
                            Spawn
                          </button>
			</span>
			<span class="w3-margin-left">${m.name}</span>
		      </li>`;
		    modelsList.innerHTML += template;
		}

		for (const spawnButton of document.querySelectorAll('.spawn-controls button')) {
                    const spawnId = spawnButton.parentElement.dataset['id'];
                    const modelURL = spawnButton.parentElement.dataset['model_url'];
		    spawnButton.addEventListener('click', function (evt) {
                        evt.preventDefault();
                        if (isSpawned(spawnId)) {
                            despawnObject(spawnId);
                        } else {
                            spawnObject(spawnId, modelURL);
                        }
		    });
                    updateSpawnUI(spawnId);
		}
	    });
	    xml.open('GET', './models/?format=json');
	    xml.send();
	};
	const observer = new MutationObserver(callback);
	observer.observe(targetNode, config);

	function isSpawned(spawnId) {
	    return document.getElementById(spawnId) !== null;
	}

	function despawnObject(spawnId) {
	    return vrScene.systems['oacs-networked-scene'].deleteEntity(spawnId);
	}

	//
	// We use a placeholder object to compute the position, relative to
	// the camera, where new objects will spawn.
	//
	const spawnPositionPlaceholder = new THREE.Object3D();
	const camera = document.querySelector('a-camera');
	camera.object3D.add(spawnPositionPlaceholder);
	spawnPositionPlaceholder.translateZ(-0.5);

	function spawnObject(spawnId, modelURL) {
	    if (isSpawned(spawnId)) {
		alert('This model already exists on the scene.');
		return false;
	    }

	    const templateId = 'template-' + spawnId;

	    //
	    // Template might already exist on the page...
	    //
	    let template = document.getElementById(templateId);
	    if (!template) {
		//
		// ...it doesn't, create and add to the scene.
		//
		const model = document.createElement('a-gltf-model');
		model.setAttribute('id', spawnId);
		model.setAttribute('center', '');
		model.setAttribute('clamp-size',
				   'maxSize: @spawn_max_size;literal@; minSize: @spawn_min_size;literal@');
		model.setAttribute('data-spawn', 'theirs');

		//
		// We first try to look for the model in the preloaded
		// assets. If these do not exist, we load the model on the
		// fly.
		//
		const assetModel = document.querySelector(`a-asset-item#${spawnId}-model`);
		model.setAttribute('src', assetModel ? `#${assetModel.id}` : `url(${modelURL})`);

		template = document.createElement('template');
		template.setAttribute('id', templateId);
		template.content.appendChild(model);
		vrScene.appendChild(template);

		//
		// The model is networked last, to make sure the
		// template is on the page.
		//
		model.setAttribute(
		    'oacs-networked-entity',
		    `permanent: true; template: #${templateId}; properties: position, rotation, scale`
		);
		model.flushToDOM(true);
	    }

	    //
	    // Spawn the local entity from the template. This will
	    // trigger remote creation as well.
	    //
	    const spawnedEntity = template.content.firstElementChild.cloneNode(true);
	    spawnedEntity.setAttribute('data-spawn', 'mine');
	    vrScene.appendChild(spawnedEntity);

	    //
	    // Compute and set the spawn position.
	    //
	    spawnPositionPlaceholder.getWorldPosition(spawnedEntity.object3D.position);

	    return true;
	}

	function updateSpawnUI(spawnId) {
	    const spawnButton = document.querySelector(`.spawn-controls[data-id='${spawnId}'] button`);
	    if (spawnButton) {
                if (isSpawned(spawnId)) {
                    spawnButton.setAttribute('class', spawnButton.getAttribute('data-class-despawn'));
                    spawnButton.textContent = spawnButton.getAttribute('data-text-despawn');
                } else {
                    spawnButton.setAttribute('class', spawnButton.getAttribute('data-class-spawn'));
                    spawnButton.textContent = spawnButton.getAttribute('data-text-spawn');
                }
	    }
	}
	vrScene.addEventListener('child-attached', (evt) => {
            updateSpawnUI(evt.detail.el.id);
        });
	vrScene.addEventListener('child-detached', (evt) => {
            updateSpawnUI(evt.detail.el.id);
        });

      </if>
      <if @webrtc_p;literal@ true>
	const webRTCStatusElement = document.querySelector('#webrtc-status');
	const webRTCConnectionStatusElement = document.querySelector('#webrtc-connection-status');
	const audioMeterElement = document.querySelector('#audiometer');
	const audioContext = new window.AudioContext();

	const analyser = new AnalyserNode(audioContext);
	analyser.minDecibels = -100;
	analyser.maxDecibels = -30;
	analyser.fftSize = 32;

	let audioMeterMediaSource;
	function audioMeter(stream) {
	    if (audioMeterMediaSource) {
		//
		// We only need to replace the stream tracked by the
		// audiometer.
		//
		audioMeterMediaSource.disconnect();
		audioMeterMediaSource = audioContext.createMediaStreamSource(stream);
		audioMeterMediaSource.connect(analyser);
		return;
	    }

	    //
	    // When the mute button is pressed, we silence our
	    // WebRTC stream and also the local stream used to
	    // generate the audio meter.
	    //
	    const hands = document.querySelectorAll('[hand-controls]');
	    const muteButton = document.querySelector('#mutebutton');

	    function isMuted() {
		return camera.getAttribute('janus-videoroom-entity').muted;
	    }

	    function mute() {
		camera.setAttribute('janus-videoroom-entity', 'muted', true);
		muteButton.classList.replace('w3-amber', 'w3-blue');
		muteButton.textContent = 'Unmute';
	    }
	    function unMute() {
		camera.setAttribute('janus-videoroom-entity', 'muted', false);
		muteButton.classList.replace('w3-blue', 'w3-amber');
		muteButton.textContent = 'Mute';
	    }

	    muteButton.addEventListener('click', function (e) {
		e.preventDefault();
		const muted = isMuted();
		if (muted) {
		    unMute();
		} else {
		    mute();
		}
	    });

	    const pushToTalkCheckBox = document.querySelector('#pushtotalk');
	    const pushToTalkAudio = document.querySelector('#pushtotalk-audio');
	    function pushToTalkHandler(e) {
		if (!pushToTalkCheckBox.checked) {
		    return;
		}

		const muted = isMuted();
		if (muted &&
		    (e.type === 'abuttondown' ||
		     e.type === 'xbuttondown' ||
		     (e.type === 'keydown' && e.ctrlKey)
		    )
		   ) {
		    unMute();
		    pushToTalkAudio.volume = 0.25;
		    pushToTalkAudio.play();
		} else {
		    mute();
		}
	    }

	    document.body.addEventListener('keydown', pushToTalkHandler);
	    document.body.addEventListener('keyup', pushToTalkHandler);
	    for (const hand of hands) {
		hand.addEventListener('abuttondown', pushToTalkHandler);
		hand.addEventListener('xbuttondown', pushToTalkHandler);
		hand.addEventListener('xbuttonup', pushToTalkHandler);
		hand.addEventListener('abuttonup', pushToTalkHandler);
	    }

	    pushToTalkCheckBox.addEventListener('click', function (e) {
		if (this.checked) {
		    mute();
		    mutebutton.setAttribute('disabled', '');
		} else {
		    unMute();
		    mutebutton.removeAttribute('disabled');
		}
	    });

	    audioMeterMediaSource = audioContext.createMediaStreamSource(stream);
	    audioMeterMediaSource.connect(analyser);
	    const dataArray = new Uint8Array(analyser.frequencyBinCount);

	    const audioMenu = getVRMenu('audio');
	    const audioLevel = document.getElementById('audio-level');
	    function draw() {
		setTimeout(draw, 100);

		//
		// No need to draw the audiobar if the menu is not
		// visible.
		//
		if (audioMenu.style.display === 'none') {
		    return;
		}

		analyser.getByteFrequencyData(dataArray);

		let barHeight = 0;
		for (let i = 0; i < dataArray.length; i++) {
		    if (barHeight < dataArray[i]) {
			barHeight = dataArray[i];
		    }
		}

		audioLevel.style.height = `${(1 - (barHeight / 255)) * 150}px`;
	    }

	    draw();
	}

	camera.addEventListener('connectionstatuschange', function (e) {
	    //
	    // Update the VR menu UI according to changes in the webRTC
	    // connection status.
	    //
	    webRTCStatusElement.classList.remove('w3-pale-green');
	    webRTCStatusElement.classList.remove('w3-pale-yellow');
	    webRTCStatusElement.classList.remove('w3-pale-red');
	    switch (e.detail.level) {
	    case 'success':
		webRTCStatusElement.classList.add('w3-pale-green');
		if (e.detail.stream) {
		    audioMeter(e.detail.stream);
		}
		break;
	    case 'warning':
		webRTCStatusElement.classList.add('w3-pale-yellow');
		break;
	    case 'danger':
		webRTCStatusElement.classList.add('w3-pale-red');
		break;
	    }

	    webRTCStatusElement.textContent = e.detail.status;

	    webRTCStatusElement.style.display = e.detail.stream ? 'none' : 'block';
	    audioMeterElement.style.display = e.detail.stream ? 'block' : 'none'

	    renderConnectionStatus(webRTCConnectionStatusElement, e);
	});
  </if>
    });
  </script>
  <if @spawn_objects_p;literal@ true or @physics_p;literal@ true>
     <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
         vrScene.setAttribute('rapier-physics', 'debug: false; @gravity@');
	 vrScene.addEventListener('loaded', () => {
	     //
	     // When objects requiring physics finish to load, attach physics to them
	     //
	     vrScene.addEventListener('model-loaded', function (e) {
		 if (e.target.hasAttribute('data-spawn')) {
		     //
		     // Objects spawned by peers
		     //
		     const spawn = e.target.getAttribute('data-spawn');
                     let type;
                     let shape = 'shape: ConvexHull;';
                     if (spawn === 'mine') {
                         type = 'type: Dynamic; @damping@';
                         shape+= 'emitCollisionEvents: true;'
                     } else {
                         type = 'type: KinematicPositionBased';
                     }
                     e.target.setAttribute('rapier-body', type);
		     e.target.setAttribute('rapier-shape', shape);
		 }
	     });

	     //
	     // When a networked object is touched by us, we try to become the
	     // object's owner.
	     //
	     vrScene.addEventListener('collidestart', function (e) {
		 if (e.target.matches('[oacs-networked-entity][rapier-body]') &&
		     !e.target.matches('a-camera, [hand-controls]') &&
		     e.detail.targetEl.matches('a-camera, [hand-controls]')) {
		     e.target.components['oacs-networked-entity'].networkedScene.grab(e.target.id);
		 }
	     });

	     vrScene.addEventListener('release', function (e) {
                 e.target.setAttribute('rapier-body', 'type: KinematicPositionBased');
                 e.target.setAttribute('rapier-shape', 'emitCollisionEvents: true');
	     });
	     vrScene.addEventListener('grab', function (e) {
                 e.target.setAttribute('rapier-body', 'type: Dynamic');
                 e.target.setAttribute('rapier-shape', 'emitCollisionEvents: false');
             });

	     if (window.AFRAME.utils.device.checkHeadsetConnected()) {
		 //
		 // On headset:
		 //
		 // Use hands to manipulate the environment. Grabbing with
		 // the controller, then touching an item will pick it up.
		 // A picked up object can be scaled up or down either via
		 // moving the thumbstick up or down, or by grabbing the
		 // item with two hands, then extending/getting them closer.
		 //
		 for (const hand of document.querySelectorAll('[hand-controls]')) {
		     hand.addEventListener('controllerconnected', function () {
			 this.setAttribute('standard-hands', '');
		     }, {once: true });
		 }
	     } else {
		 //
		 // On desktop:
		 //
		 // One "touches" the object when the cursor points at an
		 // object no farther than 2 meters
		 //
		 // When an object is "touched" we can:
		 // - Grab - Press and hold "E" and move around.
		 // - Scale - Press "+" or "-" on the keypad
		 // - Rotate - Press "X", "Y" or "Z" to rotate 90° along an
		 //   axis.
		 //
		 const camera = document.querySelector('a-camera');
		 camera.setAttribute('standard-eyes', '');
	     }
	 });
    </script>
  </if>
  <if @painting_p;literal@ true>
    <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
      if (!window.AFRAME.utils.device.checkHeadsetConnected()) {
          //
          // Painting is not supported on desktop for now (but people
          // on desktop will be able to see other people paintings).
          //
          for (const menuItem of document.querySelectorAll('[data-menu=paint]')) {
              menuItem.remove();
          }
      } else {
          const strokeUndoMessage = {
              brush: {
                  undo: 1
              }
          };
          const paintingButton = document.querySelector('#toggle-painting');
          const paintConf = {
              hideTip: true,
              hideController: false
          }
          let isPlaying = false;
          function togglePainting(hands) {
              for (const hand of hands) {
                  hand.setAttribute('standard-painting', {active: !isPlaying});
              }
	      paintingButton.textContent = isPlaying ? 'Start Painting' : 'Stop Painting';
	      paintingButton.classList.replace(
                  isPlaying ? 'w3-red' : 'w3-green',
                  isPlaying ? 'w3-green' : 'w3-red'
              );
              paintingButton.classList.replace(
                  isPlaying ? 'w3-hover-red' : 'w3-hover-green',
                  isPlaying ? 'w3-hover-green' : 'w3-hover-red'
              );
              isPlaying = !isPlaying;
          }
          vrScene.addEventListener('loaded', () => {
              const hands = document.querySelectorAll('[standard-painting]');
              paintingButton.addEventListener('click', () => {
                  togglePainting(hands);
              });
          });
          window.addEventListener('exit-vr', () => {
              //
              // Exiting VR removes peers using a headset from the scene,
              // which will clear their paintings remotely. We also clear
              // them locally.
              //
              const brush = vrScene.systems.brush;
              brush.clear(`client-@user_id;literal@`);
          });
          vrScene.addEventListener('stroke-removed', (evt) => {
              //
              // When a stroke from us is removed, we broadcast an undo
              // operation over the network.
              //
              if (evt.detail.stroke.data.owner === `client-@user_id;literal@`) {
                  const network = vrScene.systems['oacs-networked-scene'];
                  const hand = document.querySelector('[hand-controls][brush]');
                  network.sendEntityUpdate(hand, strokeUndoMessage);
                  console.log('undo sent');
              }
          });
          vrScene.addEventListener('child-attached', (evt) => {
              //
              // When a new participants (avatar) arrives on the scene,
              // send them our current painrting.
              //
              const el = evt.detail.el;
              if (el.matches('.avatar')) {
                  const brush = vrScene.systems.brush;
                  const painting = brush.getJSON(`client-@user_id;literal@`);
                  if (painting.strokes.length > 0) {
                      const network = vrScene.systems['oacs-networked-scene'];
                      console.log('sending painting:', painting);
                      network.sendToOwner(el.id, painting);
                  }
              }
          });
      }

      vrScene.addEventListener('owner-message', (evt) => {
          console.log('owner message', evt);
          const painting = evt.detail;
          if (painting.strokes) {
              //
              // Somebody sent us their painting. Display it locally.
              //
              console.log('receiving painting:', painting);
              const brush = vrScene.systems.brush;
              brush.loadJSON(painting);
          }
      });
    </script>
  </if>
