<master src="/www/blank-master">
  <property name="doc(title)">Enter VR</property>

  <include src="/packages/aframe-vr/environments/@environment;literal@/index"/>

  <template id="vr-rig">
    <if @avatar_p;literal@ true>
      <!-- Avatar -->
      <template id="avatar-template-@user_id;literal@">
        <a-entity position="0 1.6 -3"
                  class="avatar"
                  readyplayerme-avatar="model: url(@avatar_url@); hands: false; lookAt: .avatar, [oacs-networked-entity]">
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

    <a-sphere color="black" radius="0.01" id="cursor" material="shader:flat"></a-sphere>

    <a-entity id="myCameraRig">
      <!-- camera -->
      <a-camera id="client-@user_id;literal@"
                simple-navmesh-constraint="navmesh:.collision; fall:0.5; height:1.65;"
                oacs-networked-entity="template: #avatar-template-@user_id;literal@; name: @username@; randomColor: true; attach: false"
                <if @webrtc_p;literal@ true>
                  janus-videoroom-entity="room: @janus_room@; URI: @janus_url@; pin: @janus_room_pin@"
                </if>>
      </a-camera>
      <!-- hand controls -->
      <a-entity id="client-@user_id;literal@-left-hand"
                blink-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick; collisionEntities: .collision; cancelEvents: gripdown, squeeze;"
                hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
                oacs-networked-entity="template: #avatar-left-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture; attach: false">
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
                oacs-networked-entity="template: #avatar-right-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture; attach: false">
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
    <if @webrtc_p;literal@ true>
      <button class="w3-bar-item w3-button tablink" data-menu="audio" style="display: none;">Audio</button>
    </if>
    <if @spawn_objects_p;literal@ true>
      <button class="w3-bar-item w3-button tablink" data-menu="models">Models</button>
    </if>
  </div>
  <div style="background-color: white; margin-left:130px; width: max-content; height: max-content;">

    <div id="room">
      <div class="w3-container w3-teal w3-light-grey">
	<h2>Room</h2>
      </div>
      <div class="w3-panel">
        <a id="enter-vr"
           class="w3-button w3-green w3-hover-green w3-margin-bottom">Enter VR</a>
        <br>
        <a class="w3-button w3-red w3-hover-red w3-margin-bottom"
           href="@package_url@">Return to Main Menu</a>
      </div>
    </div>

    <if @webrtc_p;literal@ true>
      <div id="audio" style="display:none">
	<div class="w3-container w3-teal w3-light-grey">
	  <h2>Audio</h2>
	</div>
	<div id="audiometer" class="w3-panel w3-center">
	  <div>
            <button id="mutebutton" class="w3-button w3-amber">Mute</button>
	  </div>
          <!-- TODO: find a way to display the volume in the VR menu -->
          <!-- <span class="w3-margin-top w3-margin-bottom" -->
          <!--       id="audio-volume" -->
          <!--       style="height: 25px; width: 25px; background-color: #bbb; border-radius: 50%; display: inline-block;"> -->
          <!-- </span> -->
          <label>
	    <input type="checkbox" id="pushtotalk">Use PushToTalk
            <audio id="pushtotalk-audio"
                   style="display: none;"
                   src="/aframe-vr/resources/audio/roger.mp3"></audio>
          </label>
	</div>
      </div>
    </if>

    <if @spawn_objects_p;literal@ true>
      <div id="models" style="display:none">
	<div class="w3-container w3-teal w3-light-grey">
	  <h2>Models</h2>
	</div>
	<div class="w3-panel">
          <ul class="w3-ul w3-border w3-margin-bottom"></ul>
	</div>
      </div>
    </if>
  </div>
</div>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
  const vrScene = document.querySelector('a-scene');
  vrScene.setAttribute('oacs-networked-scene', 'wsURI: @ws_uri@');
  vrScene.setAttribute('webxr', 'overlayElement:#toolbar;');
  vrScene.setAttribute('vr-mode-ui', 'enabled: false;');
  vrScene.insertAdjacentHTML('beforeend', document.querySelector('#vr-rig').innerHTML);

  //
  // Switch to a different menu whenever the button is clicked in the
  // toolbar.
  //
  for (const l of document.querySelectorAll('#toolbar .tablink')) {
      l.addEventListener('click', function (e) {
	  const menuSelected = document.querySelector('#toolbar .tablink.w3-dark-grey');
	  menuSelected.classList.remove('w3-dark-grey');
	  document.getElementById(menuSelected.dataset.menu).style.display = 'none';
	  this.classList.add('w3-dark-grey');
	  document.getElementById(this.dataset.menu).style.display = 'block';
      });
  }
  //
  // Whenever the models menu becomes visible, fetch the models from
  // the JSON endpoint and display the spawning UI
  //
  const targetNode = document.getElementById('models');
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
  // Spawning an object.
  //

  function isSpawned(spawnId) {
      return document.getElementById(spawnId) !== null;
  }

  function despawnObject(spawnId) {
      return vrScene.systems['oacs-networked-scene'].deleteEntity(spawnId);
  }

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
          model.setAttribute('oacs-networked-entity', `permanent: true; template: #${templateId}`);
          model.setAttribute('data-spawn', 'theirs');
          model.setAttribute('src', `url(${modelURL})`);

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
      // We let the new entity spawn where we are. We
      // may be fancier at some point and let it spawn
      // e.g. "1 meter in front of us".
      //
      spawnedEntity.setAttribute('position', camera.getAttribute('position'));

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

</script>
<if @webrtc_p;literal@ true>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
      const camera = document.querySelector('a-camera');
      function audioMeter(stream) {
          document.querySelector('[data-menu=audio]').style.display = 'block';
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


          //
          // TODO: find a way to show the volume in the VR menu
          //
          // const audioContext = new window.AudioContext();

	  // const analyser = new AnalyserNode(audioContext);
	  // analyser.minDecibels = -100;
	  // analyser.maxDecibels = -30;
	  // analyser.fftSize = 32;

	  // audioContext.createMediaStreamSource(stream).connect(analyser);
	  // const dataArray = new Uint8Array(analyser.frequencyBinCount);

          // // Set up canvas context for visualizer
          // const audioVolume = document.querySelector('#audio-volume');

	  // const audioMenu = document.getElementById('audio');
	  // function draw() {
	  //     requestAnimationFrame(draw);

	  //     analyser.getByteFrequencyData(dataArray);

	  //     let barHeight = 0;
	  //     for (let i = 0; i < dataArray.length; i++) {
	  //         if (barHeight < dataArray[i]) {
	  //             barHeight = dataArray[i];
	  //         }
	  //     }

          //     audioVolume.style.backgroundColor = `rgb(${155 * (barHeight / 255) + 100}, 100, 100)`;
	  // }

	  // document.querySelector('#audiometer').style.display = 'block';
	  // draw();
      }

      camera.addEventListener('localstream', function (e) {
	  audioMeter(e.detail.stream);
      });
   </script>
</if>
