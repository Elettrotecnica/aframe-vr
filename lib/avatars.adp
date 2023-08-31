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
  </else>
  <template id="avatar-left-hand-@user_data.user_id;literal@">
    <a-entity remote-hand-controls="hand: left; handModelStyle: highPoly; color: #ffcccc"></a-entity>
  </template>
  <template id="avatar-right-hand-@user_data.user_id;literal@">
    <a-entity remote-hand-controls="hand: right; handModelStyle: highPoly; color: #ffcccc"></a-entity>
  </template>
</multiple>
