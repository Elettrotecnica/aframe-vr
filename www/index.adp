<master>

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
  <div id="menu" class="flex-container">
    <div class="flex-12">
      <if @admin_p;literal@ true>
        <a class="btn btn-default" href="@settings_url@">Room Settings</a>
      </if>
      <a class="btn btn-default" href="@avatar_url@">Manage Avatar</a>
    </div>
    <div class="flex-12">
      <a class="btn btn-default" href="@room_url@">Enter VR</a>
      <if @write_p;literal@ true>
        <a class="btn btn-default" href="@stream_url@">Stream to Room</a>
      </if>
    </div>
  </div>
