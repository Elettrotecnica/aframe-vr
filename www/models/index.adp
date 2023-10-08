<master src="/www/blank-master">
<h3>3D Models</h3>
<listtemplate name="models"></listtemplate>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    if (window.parent) {
	const vrScene = window.parent.document.querySelector('#vr a-scene');
	const camera = window.parent.document.querySelector('a-camera');

	//
	// Spawning an object.
	//
	function spawnObject(e) {
	    const itemId = e.dataset['item_id'];
	    const revisionId = e.dataset['revision_id'];
	    const modelURL = e.dataset['model_url'];

	    const spawnId = 'spawn-' + revisionId;
	    const templateId = 'template-' + spawnId;

	    const model = document.createElement('a-gltf-model');
	    model.setAttribute('id', spawnId);
	    model.setAttribute('data-item_id', itemId);
	    model.setAttribute('data-revision_id', revisionId);
	    model.setAttribute('center', '');
	    model.setAttribute('clamp-size', 'maxSize: @spawn_max_size;literal@; minSize: @spawn_min_size;literal@');
	    model.setAttribute('oacs-networked-entity', 'permanent: false; template: #' + templateId);
	    model.setAttribute('data-spawn', 'theirs');
	    model.setAttribute('src', 'url(' + modelURL + ')');

	    const template = document.createElement('template');
	    template.setAttribute('id', templateId);
	    template.content.appendChild(model);

	    //
	    // Add the template to the page
	    //
	    vrScene.appendChild(template)

	    //
	    // Spawn the local entity from the template. This will
	    // trigger remote creation as well.
	    //
	    const spawnedEntity = template.content.firstElementChild.cloneNode(true);
	    spawnedEntity.setAttribute('data-spawn', 'mine');
	    vrScene.appendChild(spawnedEntity);

	    //
	    // We let the new entity spawn where we are. We
	    // may be fancier at some point and let it spawn
	    // e.g. "1 meter in front of us".
	    //
	    spawnedEntity.setAttribute('position', camera.getAttribute('position'));
	}
	for (const s of document.querySelectorAll('.spawn')) {
            s.addEventListener('click', function (e) {
		e.preventDefault();
		spawnObject(this);
	    });
	}


    }
</script>
