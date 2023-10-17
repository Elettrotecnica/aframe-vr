<master src="/www/blank-master">
<h3>3D Models</h3>
<listtemplate name="models"></listtemplate>
<script <if @::__csp_nonce@ not nil> nonce="@::__csp_nonce;literal@"</if>>
    if (window.parent) {
	const vrScene = window.parent.document.querySelector('#vr a-scene');
	const camera = window.parent.document.querySelector('a-camera');

	function isSpawned(spawnId) {
	    return window.parent.document.getElementById(spawnId) !== null;
	}

	function despawnObject(spawnId) {
	    return vrScene.systems['oacs-networked-scene'].deleteEntity(spawnId);
	}

	//
	// Spawning an object.
	//
	function spawnObject(spawnId, modelURL) {
	    if (window.parent.document.getElementById(spawnId)) {
		alert('This model already exists on the scene.');
		return false;
	    }

	    const templateId = 'template-' + spawnId;

	    //
	    // Template might already exist on the page...
	    //
	    let template = document.getElementById(templateId);
	    if (!template) {
		//
		// ...it doesn't, create and add to the scene.
		//
		const model = document.createElement('a-gltf-model');
		model.setAttribute('id', spawnId);
		model.setAttribute('center', '');
		model.setAttribute('clamp-size', 'maxSize: @spawn_max_size;literal@; minSize: @spawn_min_size;literal@');
		model.setAttribute('oacs-networked-entity', 'permanent: true; template: #' + templateId);
		model.setAttribute('data-spawn', 'theirs');
		model.setAttribute('src', 'url(' + modelURL + ')');

		template = document.createElement('template');
		template.setAttribute('id', templateId);
		template.content.appendChild(model);

		vrScene.appendChild(template);
	    }

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

	    return true;
	}

	for (const s of document.querySelectorAll('.spawn-controls')) {
	    const spawnId = s.dataset['id'];
	    const modelURL = s.dataset['model_url'];
	    const spawn = s.querySelector('.spawn');
	    const despawn = s.querySelector('.despawn');

            spawn.addEventListener('click', function (e) {
		e.preventDefault();
		if(spawnObject(spawnId, modelURL)) {
		    spawn.style.display = 'none';
		    despawn.style.display = null;
		}
	    });
            despawn.addEventListener('click', function (e) {
		e.preventDefault();
		if(despawnObject(spawnId)) {
		    spawn.style.display = null;
		    despawn.style.display = 'none';
		}
	    });

	    const spawned = isSpawned(spawnId);
	    spawn.style.display = spawned ? 'none' : null;
	    despawn.style.display = spawned ? null : 'none';
	}

	function updateSpawnUI(e) {
	    const spawnId = e.detail.el.id;
	    const s = document.querySelector('.spawn-controls[data-id="' + spawnId + '"');
	    if (s) {
		const spawn = s.querySelector('.spawn');
		const despawn = s.querySelector('.despawn');
		const spawned = isSpawned(spawnId);
		spawn.style.display = spawned ? 'none' : null;
		despawn.style.display = spawned ? null : 'none';
	    }
	}
	vrScene.addEventListener('child-attached', updateSpawnUI);
	vrScene.addEventListener('child-detached', updateSpawnUI);
    }
</script>
