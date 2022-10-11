<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Hello, WebVR! • A-Frame</title>
    <meta name="description" content="Hello, WebVR! • A-Frame">
    <script src="js/aframe-master.min.js"></script>
    <script src="js/networked-aframe.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/8.1.1/adapter.min.js"></script>
    <script src="js/janus.js" ></script>
    <script src="js/aframe-janus-videoroom-multistream.js"></script>
  </head>
  <body>
    <a-scene oacs-networked-scene>
      <a-assets>
        <img src="images/grid.png" id="grid">
        <img id="sky" src="images/sky.png"/>
        <img id="boxTexture" src="images/mYmmbrp.jpg">

        <!-- Templates -->
        <multiple name="user_data">
          <if @user_data.avatar_p;literal@ true>
            <a-asset-item id="avatar-glb-@user_data.user_id;literal@" src="@user_data.avatar_url@"></a-asset-item>

            <!-- Avatar -->
            <template id="avatar-template-@user_data.user_id;literal@">
              <a-entity position="0 1.6 -3"
                        readyplayerme-avatar="model: #avatar-glb-@user_data.user_id;literal@; hands: false">
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
            <template id="avatar-left-hand-@user_data.user_id;literal@">
              <a-entity remote-hand-controls="hand: left; handModelStyle: highPoly;"
                        copy-material="from: #client-@user_data.user_id;literal@; fromObjectName: Wolf3D_Hands; toObjectName: handR2320">
              </a-entity>
            </template>
            <template id="avatar-right-hand-@user_data.user_id;literal@">
              <a-entity remote-hand-controls="hand: right; handModelStyle: highPoly;"
                        copy-material="from: #client-@user_data.user_id;literal@; fromObjectName: Wolf3D_Hands; toObjectName: handR2320">
              </a-entity>
            </template>
          </if>
          <else>
            <template id="avatar-template-@user_data.user_id;literal@">
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
            <template id="avatar-left-hand-@user_data.user_id;literal@">
              <a-entity remote-hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"></a-entity>
            </template>
            <template id="avatar-right-hand-@user_data.user_id;literal@">
              <a-entity remote-hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"></a-entity>
            </template>
          </else>
        </multiple>

        <template id="box-template">
          <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
        </template>
        <!-- /Templates -->
      </a-assets>

      <a-entity id="avatar-model" gltf-model="#avatar-glb-@user_id;literal@" visible="false"></a-entity>

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
        <a-camera id="client-@user_id;literal@"
                  oacs-networked-entity="template: #avatar-template-@user_id;literal@; name: @username@"
                  janus-videoroom-entity="stringIds: true; room: 1234;">
        </a-camera>
        <!-- hand controls -->
        <a-entity id="client-@user_id;literal@-left-hand"
                  teleport-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick;"
                  hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"
                  oacs-networked-entity="template: #avatar-left-hand-@user_id;literal@; color: #ffcccc"
                  copy-material="from: #avatar-model; fromObjectName: Wolf3D_Hands; toObjectName: handR2320">
        </a-entity>
        <a-entity id="client-@user_id;literal@-right-hand"
                  teleport-controls="cameraRig: #myCameraRig; teleportOrigin: a-camera; button: thumbstick;"
                  hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"
                  oacs-networked-entity="template: #avatar-right-hand-@user_id;literal@; color: #ffcccc"
                  copy-material="from: #avatar-model; fromObjectName: Wolf3D_Hands; toObjectName: handR2320">
        </a-entity>
      </a-entity>
    </a-scene>
  </body>
</html>
