<!DOCTYPE html>
<%
   # Allow unauthenticated users to enter as visitors
   set user_id [ad_conn user_id]
   if {$user_id == 0} {
       set user_id [ad_generate_random_string]
       set username "Visitor $user_id"
   } else {
       set username [person::name -person_id $user_id]
   }

 %>
<html>
  <head>
    <meta charset="utf-8">
    <title>Hello, WebVR! • A-Frame</title>
    <meta name="description" content="Hello, WebVR! • A-Frame">
    <script src="js/aframe.min.js"></script>
    <script src="js/networked-aframe.js"></script>
  </head>
  <body>
    <a-scene>
      <a-assets>
        <img src="images/grid.png" id="grid">
        <img id="sky" src="images/sky.png"/>
        <img id="boxTexture" src="images/mYmmbrp.jpg">
	<!-- Templates -->

        <!-- Avatar -->
        <template id="avatar-template">
          <a-entity class="avatar" shadow>
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
        <template id="box-template">
          <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
        </template>

        <!-- /Templates -->
      </a-assets>
      <a-entity
        geometry="primitive: plane; width: 10000; height: 10000;" rotation="-90 0 0"
        material="src: #grid; repeat: 10000 10000; transparent: true;metalness:0.6; roughness: 0.4; sphericalEnvMap: #sky;"></a-entity>

      <a-entity light="color: #ccccff; intensity: 1; type: ambient;" visible=""></a-entity>
      <a-entity light="color: ffaaff; intensity: 1.5" position="5 5 5"></a-entity>
      <a-entity light="color: white; intensity: 0.5" position="-5 5 15"></a-entity>
      <a-entity light="color: white; type: ambient;"></a-entity>

      <a-box src="#boxTexture" position="0 2 -5" rotation="0 45 45" scale="2 2 2"
         animation="property: object3D.position.y; to: 5; dir: alternate; dur: 2000; loop: true; clockSynced: true"></a-box>

      <a-sky src="#sky" rotation="0 -90 0"></a-sky>

      <a-camera id="camera">
      </a-camera>

    </a-scene>
    <script>
      window.addEventListener('load', function () {
          var proto = location.protocol == "https:" ? "wss:" : "ws:";
          var wsURI = proto + "//" + location.host + "/aframe-vr/connect";

          var userId = "client" + '<%= $user_id %>';
          var userName = "<%= $username %>";

          var naf = new NetworkedAframe({
              wsURI: wsURI,
              scene: "a-scene"
          });

          function onConnect () {
              // Attach the camera on the avatar template
              var camera = document.querySelector("#camera");
              naf.attach(camera, {
                  id: userId,
                  name: userName,
                  template: "#avatar-template",
                  color: "#" + Math.random().toString(16).substr(2,6)
              });

              // Example: creating a box in a random position in the
              // VR room
              // naf.create({
              //     id: "box-" + Math.random().toString(16).substr(2,6),
              //     template: "#box-template",
              //     position: JSON.stringify({
              //         "x": Math.random() * 2 -1,
              //         "y": 0.5,
              //         "z": Math.random() * 3 -3
              //     })
              // });
          }

          naf.connect(onConnect);
      });
      </script>
  </body>
</html>
