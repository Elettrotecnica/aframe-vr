<if @format@ eq "assets">
  <multiple name="models">
    <a-asset-item
	id="spawn-@models.live_revision@-model"
	src="@models.download_url@"></a-asset-item>
  </multiple>
</if>
<else>
  <master>
    <h3>3D Models</h3>
    <if @write_p;literal@ true>
      <formtemplate id="upload"></formtemplate>
      <br>
    </if>
    <listtemplate name="models"></listtemplate>
</else>
