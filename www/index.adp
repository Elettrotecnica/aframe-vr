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
    <script src="js/aframe-master.min.js"></script>
    <script src="js/networked-aframe.js"></script>
  </head>
  <body>
    <a-scene oacs-networked-scene>
      <a-assets>
        <img src="images/grid.png" id="grid">
        <img id="sky" src="images/sky.png"/>
        <img id="boxTexture" src="images/mYmmbrp.jpg">
	<!-- Templates -->

        <!-- Avatar -->
        <template id="avatar-template">
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
        <template id="box-template">
          <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
        </template>
        <template id="leftHand">
          <a-entity remote-hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"></a-entity>
        </template>
        <template id="rightHand">
          <a-entity remote-hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"></a-entity>
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

      <a-entity id="myCameraRig">
        <!-- camera -->
        <a-camera id="camera"
                  oacs-networked-entity="networkId: client-@user_id;literal@; template: #avatar-template; name: @username@">
        </a-camera>
        <!-- hand controls -->
        <a-entity id="myLeftHand"
                  teleport-controls="cameraRig: #myCameraRig; teleportOrigin: #camera; button: thumbstick;"
                  hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
                  oacs-networked-entity="networkId: client-@user_id;literal@-left-hand; template: #leftHand; color: #ffcccc">
        </a-entity>
        <a-entity id="myRightHand"
                  teleport-controls="cameraRig: #myCameraRig; teleportOrigin: #camera; button: thumbstick;"
                  hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
                  oacs-networked-entity="networkId: client-@user_id;literal@-right-hand; template: #rightHand; color: #ffcccc">
        </a-entity>
      </a-entity>

    </a-scene>
  </body>
</html>
