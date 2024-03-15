<master src="/www/blank-master">
  <property name="doc(title)">Enter VR</property>

  <if @interact@ nil>
    <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
     //
     // Detect if the user tried to refresh the page, and send them
     // back to the Main Menu instead, as otherwise audio will not
     // start.
     //
     const entries = performance.getEntriesByType('navigation');
     entries.forEach((entry) => {
	 if (entry.type === 'reload') {
             alert('It seems you are trying to refresh!\n\n' +
		   'Unfortunately, in order for audio to work, you must first interact with the page...\n\n' +
		   'You will be redirected to the Main Menu, please enter the experience again from there :-)'
		  );
	     window.location.assign('@package_url@');
	 }
     });
    </script>
  </if>

  <include src="/packages/aframe-vr/environments/@environment;literal@/index"/>

  <template id="vr-rig">
    <if @avatar_p;literal@ true>
      <!-- Avatar -->
      <template id="avatar-template-@user_id;literal@">
        <a-entity position="0 1.6 -3"
                  class="avatar"
                  readyplayerme-avatar="model: url(@avatar_url@); lookAt: a-camera">
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
      <a-entity remote-hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"></a-entity>
    </template>
    <template id="avatar-right-hand-@user_id;literal@">
      <a-entity remote-hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"></a-entity>
    </template>

    <a-entity id="myCameraRig">
      <!-- camera -->
      <a-camera id="client-@user_id;literal@"
                simple-navmesh-constraint="navmesh:.collision; fall:0.5; height:1.65;"
                oacs-networked-entity="template: #avatar-template-@user_id;literal@; name: @username@; randomColor: true"
                <if @webrtc_p;literal@ true>
                  janus-videoroom-entity="room: @janus_room@; URI: @janus_url@; pin: @janus_room_pin@"
                </if>>
      </a-camera>
      <!-- hand controls -->
      <a-entity id="client-@user_id;literal@-left-hand"
                blink-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick; collisionEntities: .collision; cancelEvents: gripdown, squeeze;"
                hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
                oacs-networked-entity="template: #avatar-left-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture">
	<a-sphere color="black"
		  radius="0.01"
		  id="cursor"
		  material="shader:flat"></a-sphere>
        <a-entity html="cursor:#cursor;html:#toolbar"
                  position="-0.142 -0.0166 -0.02928"
                  rotation="-80 90 0"
                  scale="0.5 0.5 0.5"></a-entity>
        <a-entity cursor
                  raycaster="showLine: false; far: 100; lineColor: red; objects: [html]; interval:100;"
                  rotation="-90 0 90"></a-entity>
      </a-entity>
      <a-entity id="client-@user_id;literal@-right-hand"
                blink-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick; collisionEntities: .collision; cancelEvents: gripdown, squeeze;"
                hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
                oacs-networked-entity="template: #avatar-right-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture">
        <a-entity cursor
                  raycaster="showLine: false; far: 100; lineColor: red; objects: [html]; interval:100;"
                  rotation="-90 0 90"></a-entity>
      </a-entity>
    </a-entity>
  </template>
</div>
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

  </div>
</div>
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
  const wsURI = `wsURI: ${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/aframe-vr/connect/@package_id@`;
  vrScene.setAttribute('oacs-networked-scene', wsURI);
  vrScene.setAttribute('webxr', 'overlayElement:#toolbar;');
  vrScene.setAttribute('xr-mode-ui', 'enabled: false;');
  vrScene.insertAdjacentHTML('beforeend', document.querySelector('#vr-rig').innerHTML);

  const websocketConnectionStatusElement = document.querySelector('#websocket-connection-status');
  vrScene.addEventListener('connectionstatuschange', function (e) {
      renderConnectionStatus(websocketConnectionStatusElement, e);
  });

  const camera = document.querySelector('a-camera');

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
  // Spawning an object.
  //

  //
  // Fetch all existing models from the JSON endpoint and append them
  // to the page assets so they can be preloaded. This should reduce
  // loading times when spawning, in particular if models do not
  // change so much during the experience.
  //
  const assetsXml = new XMLHttpRequest();
  const assets = document.querySelector('a-assets');
  assetsXml.responseType = 'json';
  assetsXml.addEventListener('load', e => {
      for (const m of assetsXml.response) {
	  assets.innerHTML += `<a-asset-item id="spawn-${m.live_revision}-model" src="${m.download_url}">`;
      }
  });
  assetsXml.open('GET', './models/?format=json');
  assetsXml.send();

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
                    <button class="w3-button w3-green w3-hover-green spawn">Spawn</button>
                    <button class="w3-button w3-red w3-hover-red despawn">Despawn</button>
                  </span>
                  <span class="w3-margin-left">${m.name}</span>
                </li>`;
	      modelsList.innerHTML += template;
	  }

          for (const s of document.querySelectorAll('.spawn-controls')) {
              const spawnId = s.dataset['id'];
              const modelURL = s.dataset['model_url'];
              const spawn = s.querySelector('.spawn');
              const despawn = s.querySelector('.despawn');

              spawn.addEventListener('click', function (e) {
                  e.preventDefault();
                  if(spawnObject(spawnId, modelURL)) {
                      spawn.style.display = 'none';
                      despawn.style.display = null;
                  }
              });
              despawn.addEventListener('click', function (e) {
                  e.preventDefault();
                  if(despawnObject(spawnId)) {
                      spawn.style.display = null;
                      despawn.style.display = 'none';
                  }
              });

              const spawned = isSpawned(spawnId);
              spawn.style.display = spawned ? 'none' : null;
              despawn.style.display = spawned ? null : 'none';
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
          model.setAttribute(
              'oacs-networked-entity',
              `permanent: true; template: #${templateId}; properties: position, rotation, scale`
          );
          model.setAttribute('data-spawn', 'theirs');

          //
          // We first try to look for the model in the preloaded
          // assets. If these do not exist, we load the model on the
          // fly.
          //
          const assetModel = document.querySelector(`a-asset-item#${spawnId}-model`);
          model.setAttribute('src', assetModel ? `#${assetModel.id}` : `url(${modelURL})`);

          model.flushToDOM(true);

          template = document.createElement('template');
          template.setAttribute('id', templateId);
          template.content.appendChild(model);

          vrScene.appendChild(template);
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

  function updateSpawnUI(e) {
      const spawnId = e.detail.el.id;
      const s = document.querySelector(`.spawn-controls[data-id='${spawnId}'`);
      if (s) {
          const spawn = s.querySelector('.spawn');
          const despawn = s.querySelector('.despawn');
          const spawned = isSpawned(spawnId);
          spawn.style.display = spawned ? 'none' : null;
          despawn.style.display = spawned ? null : 'none';
      }
  }
  vrScene.addEventListener('child-attached', updateSpawnUI);
  vrScene.addEventListener('child-detached', updateSpawnUI);

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
</script>
<if @spawn_objects_p;literal@ true or @physics_p;literal@ true>
   <%
     security::csp::require connect-src cdn.jsdelivr.net
   %>
   <script src="https://cdn.jsdelivr.net/gh/MozillaReality/ammo.js@8bbc0ea/builds/ammo.wasm.js"></script>
   <script src="/aframe-vr/resources/js/aframe-physics-system.js"></script>
   <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
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
	       const type = spawn === 'mine' ? 'type: dynamic@damping@' : 'type: kinematic; emitCollisionEvents: true';
	       e.target.setAttribute('ammo-body', type);
	       e.target.setAttribute('ammo-shape', 'type: hull');
	   }
       });

       scene.addEventListener('collidestart', function (e) {
	   if (e.target.hasAttribute('data-spawn') && e.detail.targetEl.hasAttribute('standard-hands')) {
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
	       switchBodyType(e.target, 'type: dynamic@damping@');
	   }
       });

       if (window.AFRAME.utils.device.checkHeadsetConnected()) {
	   //
           // On headset: use hands to manipulate the environment.
           //

           //
           // As soon as controllers connect, make every hand-controls
           // instance into a kinematic body, then attach the
           // standard-hands component.
           //
           for (const hand of document.querySelectorAll('[hand-controls]')) {
	       hand.addEventListener('controllerconnected', function () {
		   this.setAttribute('ammo-body', 'type: kinematic; emitCollisionEvents: true');
		   this.setAttribute('ammo-shape', 'type: sphere; fit: manual; sphereRadius: 0.08;');
		   this.setAttribute('standard-hands', '');
	       }, {once: true });
	   }
       } else {
           //
           // On desktop:
           //
           // a cursor tells where your virtual hand is extending and
           // will touch every item up to 2m away. By keeping the
           // mouse clicked, touched items will be picked up.
           //
           const camera = document.querySelector('a-camera');

           //
           // This cursor interacts only with physics objects, up to 2
           // meters away.
           //
           const cursor = document.createElement('a-cursor');
           cursor.setAttribute('far', 2);
           cursor.setAttribute('objects', '[ammo-body]');
           camera.appendChild(cursor);

           //
           // The virtual hand is an invisible sphere that moves with
           // the cursor. It is also a kinematic body with the
           // standard-hands component.
           //
           const hand = document.createElement('a-sphere');
           hand.id = 'client-hand-@user_id;literal@';
           hand.setAttribute('visible', false);
           hand.setAttribute('radius', 0.05);
           hand.setAttribute('ammo-body', 'type: kinematic; emitCollisionEvents: true');
           hand.setAttribute('ammo-shape', 'type: sphere');
           hand.setAttribute('standard-hands', '');
           cursor.appendChild(hand);

           //
           // When we hover on an entity, an interval starts. As long
           // as we hover, the virtual hand will be moved along the
           // surface of the entity we are hovering, where the raycast
           // intersection is happening.
           //
           // This makes so that the hand extends up to the extent of
           // the cursor and can get in contact with the entity to
           // interact.
           //
           let intersectionInterval;
           cursor.addEventListener('mouseenter', (e) => {
               const intersectedEl = e.detail.intersectedEl;
               intersectionInterval = setInterval(() => {
                   const intersection = cursor.components.raycaster.getIntersection(intersectedEl);
                   if (!intersection) {
                       return;
                   }
                   hand.object3D.translateOnAxis(
                       hand.object3D.worldToLocal(intersection.point),
                       intersection.distance
                   );
               }, 100);
           });
           cursor.addEventListener('mouseleave', () => {
               clearInterval(intersectionInterval);
           });
       }
   </script>
</if>
