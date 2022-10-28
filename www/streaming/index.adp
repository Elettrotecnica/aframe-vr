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
    <div class="flex-6">
      <div class="flex-12">
        <button class="btn btn-success" id="start">Start</button>
        <button class="btn btn-default" id="stop" disabled>Stop</button>
        <button class="btn btn-default" id="mute" disabled>Mute</button>
      </div>
      <div id="details" class="flex-12">
        This page will allow you to stream camera, desktop or both on one of the available surfaces in the VR space.
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
            Stream Audio only?
            Yes <input type="radio" name="audio_only_p" value="t">
            No <input type="radio" name="audio_only_p" value="f" checked>
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

        let audioOnly = false;
        for (let e of document.querySelectorAll('input[name="audio_only_p"]')) {
          if (e.checked) {
            audioOnly = e.value === 't';
            break;
          }
        }

        let confs = [];
        if (videoConf.value !== '') {
          let selectedOption = videoConf.querySelector('option[value="' + videoConf.value + '"]');
          let withVideo = !audioOnly && selectedOption.getAttribute('data-video') === 'true';
          let withAudio = selectedOption.getAttribute('data-audio') === 'true';
          if (!withVideo && !withAudio) {
            alert('Invalid setup: camera won\'t send any audio or video.');
            return;
          }
          confs.push({
            URI: "@janus_url@",
            room: @janus_room@,
            pin: "@janus_room_pin@",
            videoType: withVideo ? 'video' : null,
            id: videoConf.value,
            useAudio: withAudio,
            bitrate: videoBitrateConf.value,
            bitrateConf: videoBitrateConf
          });
        }
        if (screenConf.value !== '') {
          let selectedOption = screenConf.querySelector('option[value="' + screenConf.value + '"]');
          let withVideo = !audioOnly && selectedOption.getAttribute('data-video') === 'true';
          let withAudio = confs.length === 0 && selectedOption.getAttribute('data-audio') === 'true';
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
            bitrateConf: screenBitrateConf
          });
        }

        if (mediaConf.value !== '') {
          confs.push({
            URI: "@janus_url@",
            room: @janus_room@,
            pin: "@janus_room_pin@",
            id: mediaConf.value,
            useAudio: true,
            stream: mediaVideo.captureStream(),
            bitrate: mediaBitrateConf.value,
            bitrateConf: mediaBitrateConf
          });
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
    });
  </script>
