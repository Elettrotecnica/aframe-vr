<master>
  <property name="doc(title)">Enter VR</property>

  <iframe
     style="border:0px; width:100%; height:100%; min-height:480px;"
     src="@room_url@"></iframe>
  <div style="text-align:center" id="toolbar">
    <button class="btn btn-danger" data-href=".">Exit</a>
  </div>
  <script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    for (const b of document.querySelectorAll('#toolbar button')) {
        b.addEventListener('click', function (e) {
            window.location.href = b.getAttribute('data-href');
        });
    }
  </script>
