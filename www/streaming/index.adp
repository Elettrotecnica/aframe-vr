<master>
  <property name="doc(title)">Stream to room</property>

  <style>
    .flex-container {
       display: flex;
    }
    [class*="flex-"] {
       flex: 100%;
       margin-bottom: 10px;
    }
    @media only screen and (min-width: 768px) {
    /* For desktop: */
    .flex-1 {flex: 8.33%;}
    .flex-2 {flex: 16.66%;}
    .flex-3 {flex: 25%;}
    .flex-4 {flex: 33.33%;}
    .flex-5 {flex: 41.66%;}
    .flex-6 {flex: 50%;}
    .flex-7 {flex: 58.33%;}
    .flex-8 {flex: 66.66%;}
    .flex-9 {flex: 75%;}
    .flex-10 {flex: 83.33%;}
    .flex-11 {flex: 91.66%;}
    .flex-12 {flex: 100%;}
    }
  </style>
  <div class="flex-container">
    <div id="details" class="flex-12">
      <p>This page allows to stream multimedia content on the available
      surfaces in the VR space.</p>
      <p>Select which source you wish to stream and to which surface
      this should be streamed to, then press "Start".<p>
    </div>
    <div style="text-align: center" class="flex-12 bg-warning text-light rounded-pill" id="status">
      Waiting for server...
    </div>
    <div class="flex-6">
      <div class="flex-12">
        <button class="btn btn-success" id="start">Start</button>
        <button class="btn btn-secondary" id="stop" disabled>Stop</button>
        <button class="btn btn-secondary" id="mute" disabled>Mute</button>
      </div>
      <div id="settings" class="flex-12">
        <div class="flex-4">
          <h3>Camera</h3>
          <div>Select a surface...</div>
          <div>
            <select class="surfaces" data-type="video">
              <multiple name="available_surfaces">
                <option value="@available_surfaces.name@"
                        data-audio="@available_surfaces.audio@"
                        data-video="@available_surfaces.video@"
                        >@available_surfaces.title@ @available_surfaces.audio_video@</option>
              </multiple>
            </select>
          </div>
          <div>
            Select camera stream:
            All <input type="radio" name="camera-stream" value="all" checked>
            Video only <input type="radio" name="camera-stream" value="video">
            Audio only <input type="radio" name="camera-stream" value="audio">
          </div>
          <div>
            <div>Limit vertical resolution...</div>
	    <select id="video-height-cap">
              <option value="0">No limit</option>
              <option value="360">Cap to 360px</option>
              <option value="480">Cap to 480px</option>
              <option value="540">Cap to 540px</option>
              <option value="720">Cap to 720px</option>
              <option value="768">Cap to 768px</option>
              <option value="1080">Cap to 1080px</option>
	    </select>
          </div>
          <div>
            <div>Limit bitrate to...</div>
	    <select id="video-bitrate-cap">
              <option value="0">No limit</option>
              <option value="128">Cap to 128kbit</option>
              <option value="256">Cap to 256kbit</option>
              <option value="512">Cap to 512kbit</option>
              <option value="1024">Cap to 1mbit</option>
              <option value="1500">Cap to 1.5mbit</option>
              <option value="2000">Cap to 2mbit</option>
	    </select>
          </div>
        </div>
        <div class="flex-4">
          <h3>Screen</h3>
          <div>Select a surface...</div>
          <div>
            <select class="surfaces" data-type="screen">
              <multiple name="available_surfaces">
                <option value="@available_surfaces.name@"
                        data-audio="@available_surfaces.audio@"
                        data-video="@available_surfaces.video@"
                        >@available_surfaces.title@ @available_surfaces.audio_video@</option>
              </multiple>
            </select>
          </div>
          <div>
            Select screen stream:
            All <input type="radio" name="screen-stream" value="all" checked>
            Video only <input type="radio" name="screen-stream" value="video">
            Audio only <input type="radio" name="screen-stream" value="audio">
          </div>
          <div>
            <div>Limit vertical resolution...</div>
	    <select id="screen-height-cap">
              <option value="0">No limit</option>
              <option value="360">Cap to 360px</option>
              <option value="480">Cap to 480px</option>
              <option value="540">Cap to 540px</option>
              <option value="720">Cap to 720px</option>
              <option value="768">Cap to 768px</option>
              <option value="1080">Cap to 1080px</option>
	    </select>
          </div>
          <div>Limit bitrate to...</div>
          <div>
	    <select id="screen-bitrate-cap">
              <option value="0">No limit</option>
              <option value="128">Cap to 128kbit</option>
              <option value="256">Cap to 256kbit</option>
              <option value="512">Cap to 512kbit</option>
              <option value="1024">Cap to 1mbit</option>
              <option value="1500">Cap to 1.5mbit</option>
              <option value="2000">Cap to 2mbit</option>
	    </select>
          </div>
        </div>
        <div class="flex-4">
          <h3>Media</h3>
          <div>
            Choose a Media File...
            <input type="file" id="media-file" accept="audio/*|video/*"></input>
          </div>
          <div>Select a surface...</div>
          <div>
            <select class="surfaces" data-type="media">
              <multiple name="available_surfaces">
                <option value="@available_surfaces.name@"
                        data-audio="@available_surfaces.audio@"
                        data-video="@available_surfaces.video@"
                        >@available_surfaces.title@ @available_surfaces.audio_video@</option>
              </multiple>
            </select>
          </div>
          <div>Limit bitrate to...</div>
          <div>
	    <select id="media-bitrate-cap">
              <option value="0">No limit</option>
              <option value="128">Cap to 128kbit</option>
              <option value="256">Cap to 256kbit</option>
              <option value="512">Cap to 512kbit</option>
              <option value="1024">Cap to 1mbit</option>
              <option value="1500">Cap to 1.5mbit</option>
              <option value="2000">Cap to 2mbit</option>
	    </select>
          </div>
          <div style="max-width:320px;">
            <video id="media" style="display:none;" controls></video>
          </div>
        </div>
      </div>
      <div id="previews" class="flex-12">
        <div class="flex-4">
          <canvas id="audio-preview" style="display:none;"></canvas>
        </div>
        <div class="flex-4" style="max-width:320px;">
          <video id="video" style="display:none;"></video>
        </div>
        <div class="flex-4" style="max-width:320px;">
          <video id="screen" style="display:none;"></video>
        </div>
      </div>
    </div>
    <div id="users-list" class="flex-6">
      Connected Peers:
    </div>
  </div>

  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    window.addEventListener('load', function (e) {
      var connectors = [];

      // Enable/Disable surfaces selection when they are taken or released.
      let surfacesSelectors = document.querySelectorAll('.surfaces');
      for (let e of surfacesSelectors) {
        e.addEventListener('change', function(e) {
          let oldValue = this.getAttribute('data-old-value');
          for (let s of surfacesSelectors) {
            for (let o of s.querySelectorAll('option')) {
              if (o.value === oldValue) {
                o.style.display = null;
              } else if (this.value !== '' && o.value === this.value) {
                o.style.display = 'none';
              }
            }
          }
          this.setAttribute('data-old-value', this.value);
        });
      }

      let mediaVideo = document.querySelector("#media");
      let mediaFile = document.querySelector('#media-file');
      mediaFile.addEventListener('change', function(e) {
        let f = this.files[0];
        if (f) {
          let media = URL.createObjectURL(this.files[0]);
          mediaVideo.src = media;
          mediaVideo.style.display = "block";
        } else {
          mediaVideo.pause();
          mediaVideo.style.display = "none";
        }
      });

      let videoConf = document.querySelector('.surfaces[data-type="video"]');
      let screenConf = document.querySelector('.surfaces[data-type="screen"]');
      let mediaConf = document.querySelector('.surfaces[data-type="media"]');
      let startButton = document.querySelector('#start');
      let stopButton = document.querySelector('#stop');
      let muteButton = document.querySelector('#mute');
      let videoBitrateConf = document.querySelector('#video-bitrate-cap');
      let screenBitrateConf = document.querySelector('#screen-bitrate-cap');
      let videoHeightConf = document.querySelector('#video-height-cap');
      let screenHeightConf = document.querySelector('#screen-height-cap');
      let mediaBitrateConf = document.querySelector('#media-bitrate-cap');
      let confs = [];

      let connector = new JanusConnector({
        URI: "@janus_url@",
        room: @janus_room@,
        pin: "@janus_room_pin@",
        subscribe: true
      });
      connector.connect();

      startButton.addEventListener('click', function () {
        if (videoConf.value === '' && screenConf.value === '' && mediaConf.value === '') {
          alert('You must stream one of the possible sources to a surface.');
          return;
        }

        let microphoneTaken = false;

        let confs = [];
        if (videoConf.value !== '') {
          let selectedOption = videoConf.querySelector('option[value="' + videoConf.value + '"]');
          let selectedStream;
          for (const s of document.querySelectorAll('input[name="camera-stream"]')) {
            if (s.checked) {
              selectedStream = s.value;
              break;
            }
          }
          let withVideo = ['video', 'all'].includes(selectedStream) && selectedOption.getAttribute('data-video') === 'true';
          let withAudio = ['audio', 'all'].includes(selectedStream) && selectedOption.getAttribute('data-audio') === 'true';
          if (!withVideo && !withAudio) {
            alert('Invalid setup: camera won\'t send any audio or video.');
            return;
          }
          microphoneTaken = withAudio;
          confs.push({
            URI: "@janus_url@",
            room: @janus_room@,
            pin: "@janus_room_pin@",
            videoType: withVideo ? 'video' : null,
            id: videoConf.value,
            useAudio: withAudio,
            bitrate: videoBitrateConf.value,
            maxHeight: videoHeightConf.value,
            bitrateConf: videoBitrateConf
          });
        }
        if (screenConf.value !== '') {
          let selectedOption = screenConf.querySelector('option[value="' + screenConf.value + '"]');
          let selectedStream;
          for (const s of document.querySelectorAll('input[name="screen-stream"]')) {
            if (s.checked) {
              selectedStream = s.value;
              break;
            }
          }
          let withVideo = ['video', 'all'].includes(selectedStream) && selectedOption.getAttribute('data-video') === 'true';
          let withAudio = !microphoneTaken && ['audio', 'all'].includes(selectedStream) && selectedOption.getAttribute('data-audio') === 'true';
          if (!withVideo && !withAudio) {
            alert('Invalid setup: screen won\'t send any audio or video.');
            return;
          }
          confs.push({
            URI: "@janus_url@",
            room: @janus_room@,
            pin: "@janus_room_pin@",
            videoType: withVideo ? 'screen' : null,
            id: screenConf.value,
            useAudio: withAudio,
            bitrate: screenBitrateConf.value,
            maxHeight: screenHeightConf.value,
            bitrateConf: screenBitrateConf
          });
        }

        if (mediaConf.value !== '') {
          let selectedOption = mediaConf.querySelector('option[value="' + mediaConf.value + '"]');
          let withVideo = selectedOption.getAttribute('data-video') === 'true';
          let withAudio = selectedOption.getAttribute('data-audio') === 'true';
          if (!withVideo && !withAudio) {
            alert('Invalid setup: screen won\'t send any audio or video.');
            return;
          }
          confs.push({
            URI: "@janus_url@",
            room: @janus_room@,
            pin: "@janus_room_pin@",
            id: mediaConf.value,
            useAudio: withAudio,
            videoType: withVideo ? 'video' : null,
            stream: mediaVideo.captureStream(),
            bitrate: mediaBitrateConf.value,
            bitrateConf: mediaBitrateConf
          });
          console.error(confs[confs.length -1]);
        }

        for (conf of confs) {
          let connector = new JanusConnector(conf);
          connector.connect();
          connectors.push(connector);
          conf.bitrateConf.addEventListener('change', function(e) {
            connector.setBitrate(this.value);
          });
        }

        startButton.setAttribute('disabled', '');
        startButton.classList.remove('btn-success');
        stopButton.classList.add('btn-danger');
        stopButton.removeAttribute('disabled');
        muteButton.classList.add('btn-warning');
        muteButton.removeAttribute('disabled');
      });

      stopButton.addEventListener('click', function () {
        for (connector of connectors) {
          connector.disconnect();
          delete connector;
        }
        connectors = [];
        stopButton.setAttribute('disabled', '');
        startButton.removeAttribute('disabled');
      });

      muteButton.addEventListener('click', function () {
        for (connector of connectors) {
          connector.toggleMute();
        }
        muteButton.classList.toggle('btn-warning');
        muteButton.classList.toggle('btn-primary');
      });

      let mustReload = false;
      const statusElement = document.querySelector('#status');
      document.body.addEventListener('connectionstatuschange', (e) => {
        if (!mustReload && e.detail.level === 'danger' && !mediaVideo.paused) {
          //
          // MediaStreams generated via captureStream will not resume
          // automatically in case of reconnection, but this may not
          // be evident to the user. We refresh the UI in this case.
          //
          mustReload = true;
          alert(e.detail.status);
          window.location.reload();
        }
        statusElement.classList.remove('bg-success');
        statusElement.classList.remove('bg-warning');
        statusElement.classList.remove('bg-danger');
        statusElement.classList.add(`bg-${e.detail.level}`);
        statusElement.textContent = e.detail.status;
      });
    });
  </script>
