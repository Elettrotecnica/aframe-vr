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
        <button class="btn btn-default" id="start">Start</button>
        <button class="btn btn-default" id="stop" disabled>Stop</button>
      </div>
      <div id="details" class="flex-12">
        This page will allow you to stream camera, desktop or both on one of the available surfaces in the VR space.
      </div>
      <div id="settings" class="flex-12">
        <div class="flex-12">
          Stream Audio?
          Yes <input type="radio" name="audio_p" value="t" checked>
          No <input type="radio" name="audio_p" value="f">
        </div>
        <div class="flex-12">
          Stream the camera on this surface...
          <select class="surfaces" data-type="video">
            <multiple name="available_surfaces">
              <option value="@available_surfaces.name@"
                      data-audio="@available_surfaces.audio@"
                      data-video="@available_surfaces.video@"
                      >@available_surfaces.title@ @available_surfaces.audio_video@</option>
            </multiple>
          </select>
          <!-- Limit bitrate to... -->
	  <!-- <select id="camera_bitrate_cap"> -->
          <!--   <option value="0">No limit</option> -->
          <!--   <option value="128">Cap to 128kbit</option> -->
          <!--   <option value="256">Cap to 256kbit</option> -->
          <!--   <option value="512">Cap to 512kbit</option> -->
          <!--   <option value="1024">Cap to 1mbit</option> -->
          <!--   <option value="1500">Cap to 1.5mbit</option> -->
          <!--   <option value="2000">Cap to 2mbit</option> -->
	  <!-- </select> -->
          <div>
            Stream Audio only?
            Yes <input type="radio" name="audio_only_p" value="t">
            No <input type="radio" name="audio_only_p" value="f" checked>
          </div>
        </div>
        <div class="flex-12">
          Stream the desktop on this surface...
          <select class="surfaces" data-type="screen">
            <multiple name="available_surfaces">
              <option value="@available_surfaces.name@"
                      data-audio="@available_surfaces.audio@"
                      data-video="@available_surfaces.video@"
                      >@available_surfaces.title@ @available_surfaces.audio_video@</option>
            </multiple>
          </select>
          <!-- Limit bitrate to... -->
	  <!-- <select id="desktop_bitrate_cap"> -->
          <!--   <option value="0">No limit</option> -->
          <!--   <option value="128">Cap to 128kbit</option> -->
          <!--   <option value="256">Cap to 256kbit</option> -->
          <!--   <option value="512">Cap to 512kbit</option> -->
          <!--   <option value="1024">Cap to 1mbit</option> -->
          <!--   <option value="1500">Cap to 1.5mbit</option> -->
          <!--   <option value="2000">Cap to 2mbit</option> -->
	  <!-- </select> -->
        </div>
      </div>
      <div id="previews" class="flex-12">
        <div class="flex-12">
          <canvas id="audio-preview" style="display:none;"></canvas>
        </div>
        <div class="flex-6" style="max-width:320px;">
          <video id="video" style="display:none;"></video>
        </div>
        <div class="flex-6" style="max-width:320px;">
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

      let videoConf = document.querySelector('.surfaces[data-type="video"]');
      let screenConf = document.querySelector('.surfaces[data-type="screen"]');
      let startButton = document.querySelector('#start');
      let stopButton = document.querySelector('#stop');
      let confs = [];

      let connector = new JanusConnector({
        URI: "@janus_url@",
        room: @janus_room@,
        pin: "@janus_room_pin@",
        subscribe: true
      });
      connector.connect();

      startButton.addEventListener('click', function () {
        if (videoConf.value === '' && screenConf.value === '') {
          alert('Please provide a surface for streaming either camera or screen');
          return;
        } else if (videoConf.value === screenConf.value) {
          alert('Surfaces for camera and screen must be different');
          return;
        }

        let useAudio = false;
        for (let e of document.querySelectorAll('input[name="audio_p"]')) {
          if (e.checked) {
            useAudio = e.value === 't';
            break;
          }
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
          let withAudio = useAudio && selectedOption.getAttribute('data-audio') === 'true';
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
            useAudio: withAudio
          });
        }
        if (screenConf.value !== '') {
          let selectedOption = screenConf.querySelector('option[value="' + screenConf.value + '"]');
          let withVideo = !audioOnly && selectedOption.getAttribute('data-video') === 'true';
          let withAudio = useAudio && confs.length === 0 && selectedOption.getAttribute('data-audio') === 'true';
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
            useAudio: withAudio
          });
        }

        for (let i = 0; i < confs.length; i++) {
          let connector = new JanusConnector(confs[i]);
          connector.connect();
          connectors.push(connector);
        }

        startButton.setAttribute('disabled', '');
        stopButton.removeAttribute('disabled');
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
    });
  </script>
