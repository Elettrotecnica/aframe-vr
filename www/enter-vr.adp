<master>
  <property name="doc(title)">Enter VR</property>

  <style>
    #toolbar > div {
       float: left;
       margin-left: 10px;
    }
    #audiometer {
       display: none;
       text-align: center;
    }
    #mutebutton {
       margin-bottom: 5px;
    }
  </style>
  <iframe
     id="vr"
     style="border:0px; width:100%; height:100%; min-height:480px;"
     src="@room_url@"></iframe>
  <div id="toolbar">
    <div>
      <button class="btn btn-default btn-danger" data-href=".">Exit</button>
    </div>
    <div id="audiometer">
      <div>
        <button id="mutebutton" class="btn btn-default btn-warning">Mute</button>
      </div>
      <canvas width="25" height="150"></canvas>
    </div>
  </div>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
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
            const iframe = document.querySelector('#vr').contentWindow.document;
            document.querySelector('#mutebutton').addEventListener('click', function (e) {
                e.preventDefault();
                const camera = iframe.querySelector('a-camera');
                const muted = camera.getAttribute('janus-videoroom-entity').muted;
                camera.setAttribute('janus-videoroom-entity', 'muted', !muted);
                stream.getAudioTracks()[0].enabled = muted;
                this.classList.toggle('btn-warning');
                this.classList.toggle('btn-primary');
                this.textContent = muted ? 'Mute' : 'Unmute';
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
        window.addEventListener('load', function (e) {
            navigator.mediaDevices.getUserMedia({audio: true})
                .then(audioMeter)
                .catch(handleError);
        });
    </if>
  </script>
