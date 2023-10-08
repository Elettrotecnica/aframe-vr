<master src="/www/blank-master">
<h3>3D Models</h3>
<listtemplate name="models"></listtemplate>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    if (window.parent) {
	const vrScene = window.parent.document.querySelector('#vr a-scene');
	const camera = window.parent.document.querySelector('a-camera');
	function spawnObject(spawnURL) {
	    const req = new XMLHttpRequest();
	    req.addEventListener('load', function (e) {
		if (this.status === 200) {
		    //
		    // Add the template to the page
		    //
		    vrScene.insertAdjacentHTML('beforeend', this.response);
		    //
		    // Spawn the local entity from the template. This will
		    // trigger remote creation as well.
		    //
		    const spawnedEntity = vrScene.lastElementChild.content.firstElementChild.cloneNode(true);
		    spawnedEntity.setAttribute('data-spawn', 'mine');
		    vrScene.appendChild(spawnedEntity);
		    //
		    // We let the new entity spawn where we are. We
		    // may be fancier at some point and let it spawn
		    // e.g. "1 meter in front of us".
		    //
	            spawnedEntity.setAttribute('position', camera.getAttribute('position'));
		} else {
		    alert('Cannot create this object: ' + this.response);
		}
	    });
	    req.open('GET', spawnURL);
	    req.send();
	}
	for (const s of document.querySelectorAll('.spawn')) {
            s.addEventListener('click', function (e) {
		e.preventDefault();
		spawnObject(this.getAttribute('href'));
	    });
	}
    }
</script>
