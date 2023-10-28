<master>
  <property name="doc(title)">Main Menu</property>

  <style>
  .flex-container {
      display: flex;
  }
  [class*="flex-"] {
      flex: 100%;
  }
  [class*="flex-"] * {
      margin-bottom: 2pt;
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
        <button class="link btn btn-primary" data-href="@settings_url@">Room Settings</button>
      </if>
      <if @write_p;literal@ true>
	<button class="link btn btn-primary" data-href="@avatar_url@">Manage Avatar</button>
      </if>
      <if @write_p;literal@ true>
        <button class="link btn btn-primary" data-href="enter-vr">Enter VR</button>
      </if>
      <if @write_p;literal@ true and @stream_url@ not nil>
        <button class="link btn btn-primary" data-href="@stream_url@">Stream to Room</button>
      </if>
    </div>
  </div>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    for (const b of document.querySelectorAll('#menu button.link')) {
	b.addEventListener('click', e => {
	    e.preventDefault();
	    window.location.href = b.dataset.href;
	});
    }
  </script>
