<master>
  <property name="doc(title)">Manage Avatar</property>

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
    <div class="flex-12">
      <p>
        We suppport half-body avatars provided by ReadyPlayerMe
        (<a href="https://readyplayer.me/" target="_blank">https://readyplayer.me/</a>).
      </p>
      <p>
        To generate one, please
        visit <a href="https://vr.readyplayer.me/" target="_blank">https://vr.readyplayer.me/</a>,
        customize your avatar, then copy the avatar URL that will be
        generated (the one starting by
        https://models.readyplayer.me/...).
      </p>
      <p>
        We will download the model for you and also generate a nice
        thumbnail!
      </p>
    </div>
  </div>
  <if @avatar_image_exists_p;literal@ true>
    <div class="flex-12">
      <img src="@avatar_image_url@" width="320">
    </div>
  </if>
  <if @avatar_exists_p;literal@ true>
    <div class="flex-12">
      <h3>You already have an avatar</h3>
      <button
        id="avatar-download"
        class="btn btn-success"
        data-href="@avatar_url@">
        Download
      </button>
      <button
        id="avatar-delete"
        class="btn btn-danger"
        data-href="@delete_url@">
        Delete
      </button>
    </div>
  </if>
  <div class="flex-12">
    <h3>
      <if @avatar_exists_p;literal@ true>
        Replace avatar
      </if>
      <else>
        Add avatar
      </else>
    </h3>
    <formtemplate id="avatar"></formtemplate>
  </div>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    document.querySelector('#avatar-delete').addEventListener('click', e => {
        if (confirm('Dou you really want to delete your current avatar?')) {
            window.location.href = e.target.dataset.href;
        }
    });
    document.querySelector('#avatar-download').addEventListener('click', e => {
        window.location.href = e.target.dataset.href;
    });
  </script>
