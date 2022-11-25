<a-entity id="avatar-model" gltf-model="#avatar-glb-@user_id;literal@" visible="false"></a-entity>
<a-entity id="myCameraRig">
  <!-- camera -->
  <a-camera id="client-@user_id;literal@"
            simple-navmesh-constraint="navmesh:.collision; fall:0.5; height:1.65;"
            oacs-networked-entity="template: #avatar-template-@user_id;literal@; name: @username@"
            janus-videoroom-entity="room: @janus_room@; URI: @janus_url@; pin: @janus_room_pin@">
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
