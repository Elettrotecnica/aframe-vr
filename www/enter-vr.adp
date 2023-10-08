<master>
  <property name="doc(title)">Enter VR</property>

  <style>
    #vr {
       height: 480px;
       margin-bottom: 2pt;
    }
    #toolbar {
       display: flex;
       flex-wrap: nowrap;
    }
    #toolbar > div {
       margin-left: 2pt;
    }
    #audiometer {
       display: none;
       text-align: center;
    }
    #mutebutton {
       margin-bottom: 1pt;
    }
  </style>
  <div
    id="vr"
    >
    <include src="/packages/aframe-vr/environments/@environment;literal@/index"/>

    <template id="vr-rig">
      <if @avatar_p;literal@ true>
        <!-- Avatar -->
        <template id="avatar-template-@user_id;literal@">
          <a-entity position="0 1.6 -3"
                    readyplayerme-avatar="model: url(@avatar_url@); hands: false">
            <a-text data-name="value"
                    value=""
                    material="color: white"
                    geometry="primitive: plane; width: auto; height: auto"
                    color="black"
                    align="center"
                    width="1"
                    position="0 -0.4 -0.5"
                    rotation="0 180 0">
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
        </a-entity>
        <a-entity id="client-@user_id;literal@-right-hand"
                  blink-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick; collisionEntities: .collision; cancelEvents: gripdown, squeeze;"
                  hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
                  oacs-networked-entity="template: #avatar-right-hand-@user_id;literal@; color: #ffcccc; properties: rotation, position, gesture">
        </a-entity>
      </a-entity>
    </template>
    <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
      const vrScene = document.querySelector('#vr a-scene');
      vrScene.setAttribute('embedded', '');
      vrScene.setAttribute('oacs-networked-scene', 'wsURI: @ws_uri@');
      vrScene.insertAdjacentHTML('beforeend', document.querySelector('#vr-rig').innerHTML);
    </script>
  </div>
  <div id="toolbar">
    <div>
      <button class="btn btn-danger" data-href="@package_url@">Exit</button>
    </div>
    <div id="audiometer">
      <div>
        <button id="mutebutton" class="btn btn-warning">Mute</button>
      </div>
      <canvas width="25" height="150"></canvas>
      <div class="checkbox">
        <label>
          <input type="checkbox" id="pushtotalk">Use PushToTalk
          <audio id="pushtotalk-audio" style="display: none;" src="/aframe-vr/resources/audio/roger.mp3"></audio>
        </label>
      </div>
    </div>
  </div>
  <if @spawn_objects_p;literal@ true>
    <hr>
    <div>
      <h3>Upload Model</h3>
      <formtemplate id="upload"></formtemplate>
    </div>
    <br>
    <iframe id="models" src="@package_url@models/" style="width: 100%; height: 100vh; border:none;"></iframe>
  </if>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    const camera = document.querySelector('a-camera');
      <if @spawn_objects_p;literal@ true>
         const modelsIframe = document.querySelector('#models');
         document.querySelector('#upload').addEventListener('submit', function (e) {
	     e.preventDefault();
	     const req = new XMLHttpRequest();
	     req.addEventListener('load', function (e) {
		 if (this.status === 200) {
		     modelsIframe.contentWindow.location.reload();
		 } else {
		     alert('Cannot create this object: ' + this.response);
		 }
	     });
	     req.open('POST', './models/upload');
	     req.send(new FormData(this));
	 });
      </if>
    for (const b of document.querySelectorAll('#toolbar button[data-href]')) {
        b.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = b.getAttribute('data-href');
        });
    }
    <if @webrtc_p;literal@ true>
        function audioMeter(stream) {
            //
            // When the mute button is pressed, we silence our
            // WebRTC stream and also the local stream used to
            // generate the audio meter.
            //
            const hands = document.querySelectorAll('a-entity[local-hand-controls]');
            const audioTrack = stream.getAudioTracks()[0];
            const muteButton = document.querySelector('#mutebutton');

            function isMuted() {
                return camera.getAttribute('janus-videoroom-entity').muted;
            }

            function mute() {
                camera.setAttribute('janus-videoroom-entity', 'muted', true);
                audioTrack.enabled = false;
                muteButton.classList.add('btn-primary');
                muteButton.classList.remove('btn-warning');
                muteButton.textContent = 'Unmute';
            }
            function unMute() {
                camera.setAttribute('janus-videoroom-entity', 'muted', false);
                audioTrack.enabled = true;
                muteButton.classList.add('btn-warning');
                muteButton.classList.remove('btn-primary');
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

            const pushToTalkAudio = document.querySelector('#pushtotalk-audio');
            function pushToTalkHandler(e) {
                const muted = isMuted();
                if (muted &&
                    (e.type === 'abuttondown' ||
                     e.type === 'xbuttondown' ||
                     (e.type === 'keydown' && e.ctrlKey)
                    )
                   ) {
                    unMute();
                    pushToTalkAudio.play();
                } else {
                    mute();
                }
            }
            document.querySelector('#pushtotalk').addEventListener('click', function (e) {
                if (this.checked) {
                    mute();
                    mutebutton.setAttribute('disabled', '');
                    document.body.addEventListener('keydown', pushToTalkHandler);
                    document.body.addEventListener('keyup', pushToTalkHandler);
                    for (const hand of hands) {
                        hand.addEventListener('abuttondown', pushToTalkHandler);
                        hand.addEventListener('xbuttondown', pushToTalkHandler);
                        hand.addEventListener('xbuttonup', pushToTalkHandler);
                        hand.addEventListener('abuttonup', pushToTalkHandler);
                    }
                } else {
                    unMute();
                    mutebutton.removeAttribute('disabled');
                    document.body.removeEventListener('keydown', pushToTalkHandler);
                    document.body.removeEventListener('keyup', pushToTalkHandler);
                    for (const hand of hands) {
                        hand.removeEventListener('abuttondown', pushToTalkHandler);
                        hand.removeEventListener('xbuttondown', pushToTalkHandler);
                        hand.removeEventListener('xbuttonup', pushToTalkHandler);
                        hand.removeEventListener('abuttonup', pushToTalkHandler);
                    }
                }
            });

            const audioContext = new window.AudioContext();

            const analyser = new AnalyserNode(audioContext);
            analyser.minDecibels = -100;
            analyser.maxDecibels = -30;
            analyser.fftSize = 32;

            audioContext.createMediaStreamSource(stream).connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Set up canvas context for visualizer
            const canvas = document.querySelector('#audiometer canvas');
            const canvasCtx = canvas.getContext("2d");

            const WIDTH = canvas.width;
            const HEIGHT = canvas.height;

            function draw() {
                requestAnimationFrame(draw);

                analyser.getByteFrequencyData(dataArray);

                canvasCtx.fillStyle = "rgb(0, 0, 0)";
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                let barHeight;
                for (let i = 0; i < dataArray.length; i++) {
                    if (!barHeight || barHeight < dataArray[i]) {
                        barHeight = dataArray[i];
                    }
                }

                canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
                canvasCtx.fillRect(
                    0,
                    HEIGHT - (HEIGHT * (barHeight / 255)),
                    WIDTH,
                    HEIGHT
                );
            }

            document.querySelector('#audiometer').style.display = 'block';
            draw();
        }
        function handleError(err) {
            if (err.name === 'NotAllowedError') {
                alert('You have denied access to your microphone. You will not be able to speak. If you want to do so, please grant access to your microphone for this website in the browser settings.');
            } else {
                alert('We encountered an error while trying to access your microphone. You will not be able to speak. The browser reported: ' + err.message);
                console.error(err);
            }
        }
        navigator.mediaDevices.getUserMedia({audio: true})
           .then((stream) => {
               audioMeter(stream);
           }).catch(handleError);
    </if>
  </script>
