/**
 * A component checking whether properties on an entity have
 * changed. When this happens, an entityChanged is generated reporting
 * which properties are now different. This is used to react to
 * changes, for instance sending the new properties over the network.
 */
window.AFRAME.registerComponent('oacs-change-listener', {
  schema: {
    properties: { type: 'array', default: 'position, rotation' }
  },

  update: function () {
    this.properties = {};
    for (const p of this.data.properties) {
      this.properties[p] = {
        "old": {},
        "new": {}
      };
      this._fetchPropertyValue(p);
    }
    this.changedProperties = {};
    this.changeEvent = new Event('entityChanged', {bubbles: true});
  },

  tick: function () {
    for (const p in this.changedProperties) {
      delete this.changedProperties[p];
    }
    let changed = false;

    for (const p in this.properties) {
      this._fetchPropertyValue(p);

      const oldProperties = this.properties[p]['old'];
      const newProperties = this.properties[p]['new'];
      for (const a in oldProperties) {
        if (oldProperties[a] !== newProperties[a]) {
          this.changedProperties[p] = newProperties;
          Object.assign(oldProperties, newProperties);
          changed = true;
          break;
        }
      }
      for (const a in newProperties) {
        if (oldProperties[a] !== newProperties[a]) {
          this.changedProperties[p] = newProperties;
          Object.assign(oldProperties, newProperties);
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.el.dispatchEvent(this.changeEvent);
    }
  },

  _fetchPropertyValue: function (property) {
      switch(property) {
      case 'position':
        this._getAbsolutePosition();
        break;
      case 'rotation':
        this._getAbsoluteRotation();
        break;
      case 'gesture':
        this._getGesture();
        break;
      default:
        this.properties[property]['new'] = this.el.getAttribute(property);
      }
  },

  _getGesture: function () {
    let newValue = this.properties['gesture']['new'];
    const component = this.el.components['hand-controls'];
    if (component && component.gesture) {
      newValue = component.gesture;
    }
  },

  _getAbsoluteRotation: function () {
    // Note that we cannot use a getWorldQuaternion stunt here,
    // because various compensations are applied only to the relative
    // rotation depending on the device.
    const newValue = this.properties['rotation']['new'];
    newValue.x = 0;
    newValue.y = 0;
    newValue.z = 0;
    let el = this.el;
    while (el && el.object3D && el !== this.el.sceneEl) {
      newValue.x += el.object3D.rotation.x;
      newValue.y += el.object3D.rotation.y;
      newValue.z += el.object3D.rotation.z;
      el = el.parentElement;
    }
    newValue.x = THREE.MathUtils.radToDeg(newValue.x);
    newValue.y = THREE.MathUtils.radToDeg(newValue.y);
    newValue.z = THREE.MathUtils.radToDeg(newValue.z);
  },

  _getAbsolutePosition: function () {
    // Note that we cannot use a getWorldPosition stunt here, because
    // various compensations are applied only to the relative position
    // depending on the device.
    const newValue = this.properties['position']['new'];
    newValue.x = 0;
    newValue.y = 0;
    newValue.z = 0;
    let el = this.el;
    while (el && el.object3D && el !== this.el.sceneEl) {
      newValue.x += el.object3D.position.x;
      newValue.y += el.object3D.position.y;
      newValue.z += el.object3D.position.z;
      el = el.parentElement;
    }
  }
});

/**
 * A component for positional/non-positional audio that can get its
 * audio source directly from a MediaStream (e.g. webRTC), rather than
 * only from buffered sources (although probably more limited than the
 * upstream sound component in other regards).
 *
 * The MediaStream can be specified via javascript using the
 * setMediaStream method.
 *
 * Much of this code is actually a port of
 * https://github.com/networked-aframe/networked-aframe/blob/master/src/components/networked-audio-source.js
 * without dependencies on networked-aframe.
 */
window.AFRAME.registerComponent('mediastream-sound', {
  schema: {
    streamName: { default: 'audio' },
    positional: { default: true },
    distanceModel: {
      default: 'inverse',
      oneOf: ['linear', 'inverse', 'exponential']
    },
    maxDistance: { default: 10000 },
    refDistance: { default: 1 },
    rolloffFactor: { default: 1 }
  },

  init: function () {
    this.stream = null;
    this.sound = null;
    this.audioEl = null;
    this._setupSound = this._setupSound.bind(this);
  },

  update (oldData) {
    if (!this.sound) {
      return;
    }
    if (oldData.positional !== this.data.positional) {
      this.destroySound();
      this._setupSound(this.stream);
    } else if (this.data.positional) {
      this._setPannerProperties();
    }
  },

  setMediaStream (stream) {
    this.destroySound();
    this._setupSound(stream);
  },

  _setPannerProperties () {
    this.sound.setDistanceModel(this.data.distanceModel);
    this.sound.setMaxDistance(this.data.maxDistance);
    this.sound.setRefDistance(this.data.refDistance);
    this.sound.setRolloffFactor(this.data.rolloffFactor);
  },

  remove () {
    this.destroySound();
  },

  destroySound () {
    if (this.sound) {
      // this.el.emit('sound-source-removed', { soundSource: this.soundSource });
      this.sound.disconnect();
      this.el.removeObject3D(this.attrName);
      this.sound = null;
    }

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.srcObject = null;
      this.audioEl.load();
      this.audioEl = null;
    }
  },

  _setupSound (newStream) {
    if (!newStream) return;
    const isRemoved = !this.el.parentNode;
    if (isRemoved) return;
    const el = this.el;
    const sceneEl = el.sceneEl;

    if (!sceneEl.audioListener) {
      sceneEl.audioListener = new THREE.AudioListener();
      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
      sceneEl.addEventListener('camera-set-active', function (evt) {
        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
      });
    }

    this.sound = this.data.positional
      ? new THREE.PositionalAudio(sceneEl.audioListener)
      : new THREE.Audio(sceneEl.audioListener);
    el.setObject3D(this.attrName, this.sound);
    if (this.data.positional) {
      this._setPannerProperties();
    }

    // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
    // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
    // setting the volume to 0.
    if (/chrome/i.test(navigator.userAgent)) {
      this.audioEl = new window.Audio();
      this.audioEl.setAttribute('autoplay', 'autoplay');
      this.audioEl.setAttribute('playsinline', 'playsinline');
      this.audioEl.srcObject = newStream;
      this.audioEl.volume = 0; // we don't actually want to hear audio from this element
    }

    this.soundSource = this.sound.context.createMediaStreamSource(newStream);
    this.sound.setNodeSource(this.soundSource);
    // this.el.emit('sound-source-set', { soundSource: this.soundSource });
    this.stream = newStream;
  }
});

/**
 * A component that "listens" to a stream and maintains a list of
 * "loud items" corrently on the scene. It also provides a method to
 * obtain the currently loudest item from the perspective of a
 * particular entity.
 *
 * Its purpose is to implement reaction to noise in a scene.
 *
 */
window.AFRAME.registerComponent('mediastream-listener', {
  init: function () {
    this.stream = null;
    this.dataArray = null;
    this.analyser = null;
    this.isMakingNoise = false;
    this.loudness = 0;
    this.loudEvent = new Event('mediastream-listener-loud', {bubbles: true});
    this.silentEvent = new Event('mediastream-listener-silent', {bubbles: true});

    this.loudItems = {};
    const self = this;
    this.el.sceneEl.addEventListener('mediastream-listener-loud', function (e) {
      if (e.target !== self.el) {
        self.loudItems[e.target] = [e.target, e.target.components['mediastream-listener'].loudness];
        console.log(self.el, ' detects sound from ', e.target);
      }
    });
    this.el.sceneEl.addEventListener('mediastream-listener-silent', function (e) {
      if (e.target !== self.el) {
        delete self.loudItems[e.target];
        console.log(self.el, ' does not hear ', e.target);
      }
    });
  },

  tick: function () {
    if (!this.stream) return;
    this.loudness = this._getLoudness();
    if (this.loudness > 127) {
      if (!this.isMakingNoise) {
        this.el.dispatchEvent(this.loudEvent);
        this.isMakingNoise = true;
      }
    } else if (this.isMakingNoise) {
      this.el.dispatchEvent(this.silentEvent);
      this.isMakingNoise = false;
    }
  },

  // Returns the "loudest" sound from the perspective of this element.
  listen: function () {
    let maxNoise = 0;
    let maxItem = null;

    const myPosition = this.el.object3D.position;

    for (const e in this.loudItems) {
      const el = this.loudItems[e][0];
      const loudness = this.loudItems[e][1];
      const soundPosition = el.object3D.position;
      const distance = myPosition.distanceTo(soundPosition);
      // We use an inverse quadratic attenuation based on the
      // distance.
      const noise = loudness / distance ** 2;
      if (noise > 0 && noise > maxNoise) {
        maxNoise = noise;
        maxItem = el;
      }
    }

    return maxItem;
  },

  // Returns our loudness as a number between 0 and 255
  _getLoudness: function () {
    let maxByteFrequencyData = 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    for (const d of this.dataArray) {
      if (d > maxByteFrequencyData) {
        maxByteFrequencyData = d;
      }
    }
    return maxByteFrequencyData;
  },

  setMediaStream: function (stream) {
    const audioContext = new window.AudioContext();
    const soundSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    // We only want to detect sound, use a very low frequency
    // resolution for the analyzer.
    analyser.minDecibels = -100;
    analyser.maxDecibels = 0;
    analyser.fftSize = 32;
    soundSource.connect(analyser);
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    this.stream = stream;
  }

});

/**
 * A component providing a bit of facility to VR halfbody avatars from
 * https://readyplayer.me/
 *
 * Features:
 * - generate separate entities from each node in the model tree, so
 *   that e.g. hands can be moved or rotated separately from the rest
 *   of the body. This works by specifying sub-templates to the entity
 *   named after the nodes we want to expand.
 * - allow to hide certain parts of the model, so that e.g. one can
 *   use only the head and no hands. This works only on those
 *   ReadyPlayerMe models that use separate meshes for different parts
 *   of the body. Later model seem to use one single mesh, but it is
 *   possible to generate one that has no hands, when these are not
 *   needed.
 * - idle eyes animation triggers after a configurable number of
 *   seconds of inactivity.
 * - model will look either at a specific entity, or to entities that
 *   are making noise (via the downstream mediastream-listener
 *   component)
 *
 * Model is automatically rotated 180° (default would face the user)
 * and offset 65cm, so that head is at 0 level with respect to its
 * containing entity.
 *
 * Inspired by the "inflation" approach used in Mozilla Hubs
 *
 * See https://docs.readyplayer.me/ready-player-me/avatars/avatar-creator/vr-avatar for a description of the avatar's structure.
 *
 */
window.AFRAME.registerComponent('readyplayerme-avatar', {
  schema: {
    model: {type: 'model'},
    hands: {type: 'boolean', default: true},
    shirt: {type: 'boolean', default: true},
    head: {type: 'boolean', default: true},
    idleTimeout: {type: 'int', default: 10},
    lookAt: {type: 'selector'},
    listen: {type: 'boolean', default: true}
  },

  init: function () {
    this.model = null;
    this.animations = null;
    this.isIdle = false;
    // The identity quaternion is used to calculate the rotation angle
    // of our eyes when we are looking at objects.
    this.identityQuaternion = new THREE.Quaternion();
    this.identityQuaternion.identity();
  },

  _inflate: function (node) {
    if (node.type === 'SkinnedMesh') {
      switch (node.name) {
        case 'Wolf3D_Hands':
          node.visible = this.data.hands;
          break;
        case 'Wolf3D_Shirt':
          node.visible = this.data.shirt;
          break;
        default:
          node.visible = this.data.head;
      }
    } else if (node.name === 'RightEye') {
      this.rightEye = node;
    } else if (node.name === 'LeftEye') {
      this.leftEye = node;
    }

    // inflate subtrees first so that we can determine whether or not this node needs to be inflated
    const childrenEntities = [];
    // setObject3D mutates the node's parent, so we have to use a copy
    // of the children as they are now (children is a live
    // collection).
    for (const child of node.children.slice(0)) {
      const childEntity = this._inflate(child);
      if (childEntity) {
        childrenEntities.push(childEntity);
      }
    }

    const nodeTemplate = this.el.querySelector('template[data-name=\'' + node.name + '\'');
    if (node.name !== 'Scene' && !nodeTemplate && childrenEntities.length === 0) {
      // This node won't become an entity
      return;
    }

    // If the user supplied a custom template for this node we will
    // use it, otherwise we default to an a-entity.
    let el;
    if (nodeTemplate && nodeTemplate.content.firstElementChild) {
      el = nodeTemplate.content.firstElementChild.cloneNode(true);
    } else {
      el = document.createElement('a-entity');
    }

    if (node.name === 'Scene') {
      // Compensate that the model is turned the other way around and
      // offset from the ground around 65cm, by countering this on the
      // scene element.
      el.setAttribute('position', '0 -0.65 0');
      el.setAttribute('rotation', '0 180 0');
    }

    for (const childEntity of childrenEntities) {
      el.appendChild(childEntity);
    }

    // Remove invalid CSS class name characters.
    const className = (node.name || node.uuid).replace(/[^\w-]/g, '');
    el.classList.add(className);

    // AFRAME rotation component expects rotations in YXZ, convert it
    if (node.rotation.order !== 'YXZ') {
      node.rotation.setFromQuaternion(node.quaternion, 'YXZ');
    }

    // Copy over the object's transform to the THREE.Group and reset the actual transform of the Object3D
    // all updates to the object should be done through the THREE.Group wrapper
    el.object3D.position.copy(node.position);
    el.object3D.rotation.copy(node.rotation);
    el.object3D.matrixNeedsUpdate = true;

    node.matrixAutoUpdate = false;
    node.matrix.identity();
    node.matrix.decompose(node.position, node.rotation, node.scale);

    el.setObject3D(node.type.toLowerCase(), node);

    // Set the name of the `THREE.Group` to match the name of the node,
    // so that templates can be attached to the correct AFrame entity.
    el.object3D.name = node.name;

    // Set the uuid of the `THREE.Group` to match the uuid of the node,
    // so that `THREE.PropertyBinding` will find (and later animate)
    // the group. See `PropertyBinding.findNode`:
    // https://github.com/mrdoob/three.js/blob/dev/src/animation/PropertyBinding.js#L211
    el.object3D.uuid = node.uuid;
    node.uuid = THREE.MathUtils.generateUUID();

    return el;
  },

  _look: function () {
    if (this.isIdle || !this.leftEye || !this.rightEye) {
      return;
    }

    let lookAt;
    if (this.listen) {
      let listener = this.el.components['mediastream-listener'];
      if (listener) {
        lookAt = listener.listen();
      }
    }

    if (lookAt) {
      this.lookAt = lookAt;
    } else {
      lookAt = this.lookAt;
    }

    if (lookAt) {
      for (let eye of [this.leftEye, this.rightEye]) {
        // Look at the object, but constrain the eyes rotation to 0.8
        // radians. When the angle is bigger, just look forward.
        eye.lookAt(lookAt.object3D.position);
        if (eye.quaternion.angleTo(this.identityQuaternion) > 0.8) {
          eye.quaternion.copy(this.identityQuaternion);
        }
        // Compensate a PI/2 offset in the X rotation.
        eye.rotateX(Math.PI / 2);
      }
    }
  },

  _startIdle: function () {
    // Forget what we were looking at as we become idle.
    this.lookAt = this.defaultLookAt;
    this.isIdle = true;
    this.idleAnimation.play();
  },

  _stopIdle: function () {
    this.isIdle = false;
    this.idleMixer.stopAllAction();
  },

  tick: function (time, delta) {
    if (!this.idleMixer) {
      // Model is not initialized yet.
      return;
    }

    this._look();

    this.idle -= delta;
    if (this.idle <= 0 && !this.isIdle) {
      this._startIdle();
    } else if (this.idle > 0 && this.isIdle) {
      this._stopIdle();
    }

    if (this.isIdle) {
      this.idleMixer.update(delta / 1000);
    }
  },

  update: function () {
    const self = this;
    const el = this.el;

    if (this.data.lookAt) {
      this.lookAt = this.data.lookAt;
      this.defaultLookAt = this.lookAt;
    }

    if (this.data.listen !== undefined) {
      this.listen = this.data.listen;
    }

    if (this.data.idleTimeout) {
      this.idleTimeout = this.data.idleTimeout * 1000;
      this.idle = this.idleTimeout;
    }

    const src = this.data.model;
    if (!src) { return; }

    this.remove();

    this.el.addEventListener('model-loaded', function (e) {
      const mesh = e.detail.model;

      // When the model comes with animations, get the idle_eyes_2 one
      // (the 5th one) and set it up so that whenever the model is
      // still for more than idleTimeout seconds, the animation will
      // start.
      if (mesh.animations && mesh.animations[4]) {
        const idleMixer = new THREE.AnimationMixer(mesh);
        const idleAnimation = idleMixer.clipAction(mesh.animations[4]);
        idleAnimation.clampWhenFinished = true;
        idleAnimation.loop = THREE.LoopPingPong;
        idleAnimation.repetitions = Infinity;
        idleAnimation.timeScale = 0.5;
        idleAnimation.time = 0;
        idleAnimation.weight = 1;

        this.setAttribute('oacs-change-listener', 'properties: position, rotation');
        this.addEventListener('entityChanged', function () {
          self.idle = self.idleTimeout;
        });

        self.idleAnimation = idleAnimation;
        self.idleMixer = idleMixer;
      }

      const inflated = self._inflate(mesh);
      if (inflated) {
        el.appendChild(inflated);
      }
    });

    this.el.setAttribute('gltf-model', src);
  },

  remove: function () {
    this.el.removeAttribute('gltf-model');
  }
});

// Found at https://github.com/aframevr/assets.
const MODEL_URLS = {
  toonLeft: 'https://cdn.aframe.io/controllers/hands/leftHand.glb',
  toonRight: 'https://cdn.aframe.io/controllers/hands/rightHand.glb',
  lowPolyLeft: 'https://cdn.aframe.io/controllers/hands/leftHandLow.glb',
  lowPolyRight: 'https://cdn.aframe.io/controllers/hands/rightHandLow.glb',
  highPolyLeft: 'https://cdn.aframe.io/controllers/hands/leftHandHigh.glb',
  highPolyRight: 'https://cdn.aframe.io/controllers/hands/rightHandHigh.glb'
};

// Poses.
const ANIMATIONS = {
  open: 'Open',
  // point: grip active, trackpad surface active, trigger inactive.
  point: 'Point',
  // pointThumb: grip active, trigger inactive, trackpad surface inactive.
  pointThumb: 'Point + Thumb',
  // fist: grip active, trigger active, trackpad surface active.
  fist: 'Fist',
  // hold: trigger active, grip inactive.
  hold: 'Hold',
  // thumbUp: grip active, trigger active, trackpad surface inactive.
  thumbUp: 'Thumb Up'
};

// Map animation to public events for the API.
const EVENTS = {};
EVENTS[ANIMATIONS.fist] = 'grip';
EVENTS[ANIMATIONS.thumbUp] = 'pistol';
EVENTS[ANIMATIONS.point] = 'pointing';

/**
 * A component to animate a hand model by directly specifying the
 * gesture.
 *
 * The purpose of this module is to implement "networked hands", where
 * the gesture performed from a hand-controls entity on host A are
 * collected, broadcasted to host B and mirrored by this component on
 * the remote avatar hands.
 *
 * Translate button events to semantic hand-related event names:
 *   (gripclose, gripopen, thumbup, thumbdown, pointup, pointdown)
 * Load hand model with gestures that are applied based on the button pressed.
 *
 * @property {string} Hand mapping (`left`, `right`).
 */
window.AFRAME.registerComponent('remote-hand-controls', {
  schema: {
    gesture: {default: ANIMATIONS.open, oneOf: Object.values(ANIMATIONS)},
    color: {default: 'white', type: 'color'},
    hand: { default: 'left' },
    handModelStyle: {default: 'lowPoly', oneOf: ['lowPoly', 'highPoly', 'toon']}
  },

  init: function () {
    var el = this.el;
    // Current pose.
    this.gesture = this.data.gesture;
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin('anonymous');

    el.object3D.visible = true;
  },

  tick: function (time, delta) {
    var mesh = this.el.getObject3D('mesh');

    if (!mesh || !mesh.mixer) { return; }

    mesh.mixer.update(delta / 1000);
  },

  /**
   * Update handler. Does the init stuff and most importantly, tracks
   * changes in the gesture property.
   */
  update: function (oldData) {
    var el = this.el;
    var hand = this.data.hand;
    var previousHand = oldData.hand;
    var handModelStyle = this.data.handModelStyle;
    var handColor = this.data.color;
    var gesture = this.data.gesture;
    var self = this;

    // Set model.
    if (hand !== previousHand) {
      var handmodelUrl = MODEL_URLS[handModelStyle + hand.charAt(0).toUpperCase() + hand.slice(1)];
      this.loader.load(handmodelUrl, function (gltf) {
        var mesh = gltf.scene.children[0];
        var handModelOrientation = hand === 'left' ? Math.PI / 2 : -Math.PI / 2;
        mesh.mixer = new THREE.AnimationMixer(mesh);
        self.clips = gltf.animations;
        el.setObject3D('mesh', mesh);

        var handMaterial = mesh.children[1].material;
        handMaterial.color = new THREE.Color(handColor);
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, handModelOrientation);
      });
    }

    this.animateGesture(gesture);
  },

  remove: function () {
    this.el.removeObject3D('mesh');
  },

  /**
   * Play corresponding clip to a gesture
   */
  getClip: function (gesture) {
    var clip;
    var i;
    for (i = 0; i < this.clips.length; i++) {
      clip = this.clips[i];
      if (clip.name !== gesture) { continue; }
      return clip;
    }
  },

  /**
   * Play gesture animation.
   *
   * @param {string} gesture - Which pose to animate to.
   */
  animateGesture: function (gesture) {
    if (gesture && gesture !== this.gesture) {
      this.playAnimation(gesture, this.gesture);
      this.gesture = gesture;
    }
  },

  /**
  * Play hand animation based on button state.
  *
  * @param {string} gesture - Name of the animation as specified by the model.
  * @param {string} lastGesture - Previous pose.
  */
  playAnimation: function (gesture, lastGesture) {
    var clip;
    var fromAction;
    var mesh = this.el.getObject3D('mesh');
    var toAction;

    if (!mesh) { return; }

    // Stop all current animations.
    mesh.mixer.stopAllAction();

    // Grab clip action.
    clip = this.getClip(gesture);
    toAction = mesh.mixer.clipAction(clip);
    toAction.clampWhenFinished = true;
    toAction.loop = THREE.LoopRepeat;
    toAction.repetitions = 0;
    toAction.timeScale = 1;
    toAction.time = 0;
    toAction.weight = 1;

    // Animate or crossfade from gesture to gesture.
    clip = this.getClip(lastGesture);
    fromAction = mesh.mixer.clipAction(clip);
    fromAction.weight = 0.15;
    fromAction.play();
    toAction.play();
    fromAction.crossFadeTo(toAction, 0.15, true);
  }
});

/**
 * A component connecting an entity to a janus-gateway backend via the
 * videoroom plugin. This version supports the new multistream feature
 * of Janus, where only one connection is maintained regardless of the
 * number of peers.
 *
 * This component enables audio chat via webRTC by grabbing the
 * microphone and subscribing to specified videoroom plugin
 * instance. When a new publisher is available, the peer's MediaStream
 * is attached to the entity with id corresponding to the
 * subscription's id or display property, depending on whether your
 * Janus plugin is configured to support string ids.
 *
 * Using string ids is useful in hybrid scenarios, where people from
 * outside VR subscribe to the room (e.g. to share their screens or
 * camera and be projected on a a-video element), as allows to free
 * the display property of our subscription and show human-readable
 * names to the external peer.
 *
 * Using the Janus API either via javascript or using the wrapper
 * provided in this package, is possible to create and configure the
 * room parameters on the fly or at a certain point in time (e.g. at
 * server startup or upon package intantiation).
 *
*/
window.AFRAME.registerComponent('janus-videoroom-entity', {
  schema: {
    URI: {type: 'string'},
    room: {type: 'string'},
    pin: {type: 'string', default: ''},
    id: {type: 'string'},
    display: {type: 'string'},
    debug: {type: 'boolean', default: false},
    stringIds: {type: 'boolean', default: false},
    muted: {type: 'boolean', default: false}
  },

  init: function () {
    if (!window.Janus) {
      console.error('Janus libraries have not been loaded.');
      return;
    }

    if (!this.data.URI) {
      this.URI = this._defaultURI();
    } else {
      this.URI = this.data.URI;
    }

    this.room = this.data.room;
    this.pin = this.data.pin;

    this.debug = this.data.debug;
    // this.debug = 'all';

    // By default, Janus videoroom plugin wants integer ids, but one
    // can set the 'string_ids' property to true in the plugin conf to
    // use strings. In such setup, one must also set 'stringIds'
    // component flag to true.
    const id = this.data.id ? this.data.id : this.el.getAttribute('id');
    this.stringIds = this.data.stringIds;
    if (this.stringIds) {
      // With string ids I can use the display property for the human
      // readable username, which would just be ignored otherwise.
      this.id = id;
      this.display = this.data.name ? this.data.name : this.id;
    } else {
      this.id = null;
      this.display = id;
      // If ids are numbers, then we have to cast the room id as well
      this.room = window.parseInt(this.room, 10);
    }

    this.janus = null;
    this.pluginHandle = null;
    this.privateId = null;
    this.stream = null;

    this.remoteFeed = null;
    this.feeds = {};
    this.feedStreams = {};
    this.subStreams = {};
    this.subscriptions = {};
    this.remoteTracks = {};
    this.bitrateTimer = [];
    this.simulcastStarted = {};

    this.creatingSubscription = false;

    this._connect();
  },

  update: function (oldData) {
    this._toggleMute();
  },

  _toggleMute: function () {
    if (this.pluginHandle) {
      const muted = this.pluginHandle.isAudioMuted();
      if (this.data.muted && !muted) {
        window.Janus.log('Muting local stream...');
        this.pluginHandle.muteAudio();
      }
      if (!this.data.muted && muted) {
        window.Janus.log('Unmuting local stream...');
        this.pluginHandle.unmuteAudio();
      }
    }
  },

  _defaultURI: function () {
    if (window.location.protocol === 'http:') {
      return 'http://' + window.location.hostname + ':8088/janus';
    } else {
      return 'https://' + window.location.hostname + ':8089/janus';
    }
  },

  _feedToHTMLId: function (feed) {
    return this.stringIds ? feed.id : feed.display;
  },

  _attachTrack: function (element, track) {
    const stream = new MediaStream([track]);
    if (track.kind === 'video') {
      // Track is a video: we require a video element that will
      // become the material of our object.
      let v = element.querySelector('video');
      if (!v) {
        v = document.createElement('video');
        v.autoplay = true;
        // We create an element with a unique id so that aframe won't
        // try to reuse old video elements from the cache.
        v.id = track.id + (new Date()).getTime();
        element.appendChild(v);
      }
      v.srcObject = stream;
      element.setAttribute('material', 'src', '#' + v.id);
    } else if (track.kind === 'audio') {
      // Track is audio: we attach it to the element.
      // TODO: right now we assume audio to be positional.
      element.setAttribute('mediastream-sound', '');
      element.components['mediastream-sound'].setMediaStream(stream);
      // We also attach the listener component to track sound on
      // this entity and be able to react to sound.
      element.setAttribute('mediastream-listener', '');
      element.components['mediastream-listener'].setMediaStream(stream);
    }
  },

  // Adds a track to the scene
  _addTrack: function (feed, track) {
    if (!feed) {
      return;
    }

    const id = this._feedToHTMLId(feed);

    if (!this.remoteTracks[id]) {
      this.remoteTracks[id] = [];
    }
    this.remoteTracks[id].push(track);

    const element = document.getElementById(id);
    if (element && element.object3D) {
      this._attachTrack(element, track);
    }
  },

  // Deletes a track from the scene
  _removeTrack: function (element, track) {
    if (track.kind === 'video') {
      element.setAttribute('material', 'src', null);
      const v = element.querySelector('video');
      if (v) {
        v.parentElement.removeChild(v);
      }
    } else {
      element.removeAttribute('mediastream-sound');
      element.removeAttribute('mediastream-listener');
    }
  },

  _unsubscribeFrom: function (id) {
    // Unsubscribe from this publisher
    const feed = this.feedStreams[id];
    if (!feed) {
      return;
    }

    window.Janus.debug('Feed ' + id + ' (' + feed.display + ') has left the room, detaching');

    const htmlId = this._feedToHTMLId(feed);
    const element = document.getElementById(htmlId);
    if (element && element.object3D) {
      for (track of this.remoteTracks[htmlId]) {
        console.log('removing track from element', element, track);
        this._removeTrack(element, track);
      }
    }
    delete this.remoteTracks[htmlId];

    if (this.bitrateTimer[id]) {
      clearInterval(this.bitrateTimer[id]);
    }
    this.bitrateTimer[id] = null;
    delete this.simulcastStarted[id];
    delete this.feeds[id];
    delete this.feedStreams[id];
    // Send an unsubscribe request
    const unsubscribe = {
      request: 'unsubscribe',
      streams: [{ feed: id }]
    };
    if (this.remoteFeed != null) {
      this.remoteFeed.send({ message: unsubscribe });
    }
    delete this.subscriptions[id];
  },

  _publishOwnFeed: function () {
    // Publish our stream

    // We want sendonly audio
    const tracks = [];
    tracks.push({ type: 'audio', capture: true, recv: false });

    const self = this;
    this.pluginHandle.createOffer({
      tracks: tracks,
      success: function (jsep) {
        window.Janus.debug('Got publisher SDP!');
        window.Janus.debug(jsep);
        const publish = { request: 'configure', audio: true, video: false };
        // You can force a specific codec to use when publishing by using the
        // audiocodec and videocodec properties, for instance:
        // publish['audiocodec'] = 'opus'
        // to force Opus as the audio codec to use, or:
        // publish['videocodec'] = 'vp9'
        // to force VP9 as the videocodec to use. In both case, though, forcing
        // a codec will only work if: (1) the codec is actually in the SDP (and
        // so the browser supports it), and (2) the codec is in the list of
        // allowed codecs in a room. With respect to the point (2) above,
        // refer to the text in janus.plugin.videoroom.cfg for more details
        // if (acodec) {
        //   publish['audiocodec'] = acodec;
        // }
        // if (vcodec) {
        //   publish['videocodec'] = vcodec;
        // }
        self.pluginHandle.send({ message: publish, jsep: jsep });
      },
      error: function (error) {
        window.Janus.error('WebRTC error:', error);
      }
    });
  },

  _subscribeTo: function (sources) {
    const self = this;
    // Check if we're still creating the subscription handle
    if (this.creatingSubscription) {
      // Still working on the handle, send this request later when it's ready
      setTimeout(function () {
        self._subscribeTo(sources);
      }, 500);
      return;
    }
    // If we already have a working subscription handle, just update that one
    if (this.remoteFeed) {
      // Prepare the streams to subscribe to, as an array: we have the list of
      // streams the feeds are publishing, so we can choose what to pick or skip
      const subscription = [];
      for (const s in sources) {
        const streams = sources[s];
        for (const i in streams) {
          const stream = streams[i];
          // If the publisher is VP8/VP9 and this is an older Safari, let's avoid video
          if (stream.type === 'video' && window.Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
             (stream.codec === 'vp9' || (stream.codec === 'vp8' && !window.Janus.safariVp8))) {
            window.Janus.warning('Publisher is using ' + stream.codec.toUpperCase +
                                 ', but Safari does not support it: disabling video stream #' + stream.mindex);
            continue;
          }
          if (stream.disabled) {
            window.Janus.log('Disabled stream:', stream);
            // TODO Skipping for now, we should unsubscribe
            continue;
          }
          if (this.subscriptions[stream.id] && this.subscriptions[stream.id][stream.mid]) {
            window.Janus.log('Already subscribed to stream, skipping:', stream);
            continue;
          }
          subscription.push({
            feed: stream.id,// This is mandatory
            mid: stream.mid// This is optional (all streams, if missing)
          });
          if (!this.subscriptions[stream.id]) {
            this.subscriptions[stream.id] = {};
          }
          this.subscriptions[stream.id][stream.mid] = true;
        }
      }
      if (subscription.length === 0) {
        // Nothing to do
        return;
      }
      this.remoteFeed.send({ message: {
        request: 'subscribe',
        streams: subscription
      }});
      // Nothing else we need to do
      return;
    }
    // If we got here, we're creating a new handle for the subscriptions (we only need one)
    this.creatingSubscription = true;
    this.janus.attach({
      plugin: 'janus.plugin.videoroom',
      opaqueId: self.display,
      success: function (pluginHandle) {
        self.remoteFeed = pluginHandle;
        window.Janus.log('Plugin attached! (' + self.remoteFeed.getPlugin() + ', id=' + self.remoteFeed.getId() + ')');
        window.Janus.log('  -- This is a multistream subscriber');
        // Prepare the streams to subscribe to, as an array: we have the list of
        // streams the feed is publishing, so we can choose what to pick or skip
        const subscription = [];
        for (const s in sources) {
          const streams = sources[s];
          for (const i in streams) {
            const stream = streams[i];
            // If the publisher is VP8/VP9 and this is an older Safari, let's avoid video
            if (stream.type === 'video' && window.Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
               (stream.codec === 'vp9' || (stream.codec === 'vp8' && !window.Janus.safariVp8))) {
              window.Janus.warning('Publisher is using ' + stream.codec.toUpperCase +
                            ', but Safari does not support it: disabling video stream #' + stream.mindex);
              continue;
            }
            if (stream.disabled) {
              window.Janus.log('Disabled stream:', stream);
              // TODO Skipping for now, we should unsubscribe
              continue;
            }
            window.Janus.log('Subscribed to ' + stream.id + '/' + stream.mid + '?', self.subscriptions);
            if (self.subscriptions[stream.id] && self.subscriptions[stream.id][stream.mid]) {
              window.Janus.log('Already subscribed to stream, skipping:', stream);
              continue;
            }
            subscription.push({
              feed: stream.id,// This is mandatory
              mid: stream.mid// This is optional (all streams, if missing)
            });
            if (!self.subscriptions[stream.id]) {
              self.subscriptions[stream.id] = {};
            }
            self.subscriptions[stream.id][stream.mid] = true;
          }
        }
        // We wait for the plugin to send us an offer
        const subscribe = {
          request: 'join',
          room: self.room,
          pin: self.pin,
          ptype: 'subscriber',
          streams: subscription,
          use_msid: false,
          private_id: self.privateId
        };
        self.remoteFeed.send({ message: subscribe });
      },
      error: function (error) {
        window.Janus.error('  -- Error attaching plugin...', error);
      },
      iceState: function (state) {
        window.Janus.log('ICE state (remote feed) changed to ' + state);
      },
      webrtcState: function (on) {
        window.Janus.log('Janus says this WebRTC PeerConnection (remote feed) is ' + (on ? 'up' : 'down') + ' now');
      },
      slowLink: function (uplink, lost, mid) {
        window.Janus.warn('Janus reports problems ' + (uplink ? 'sending' : 'receiving') +
                   ' packets on mid ' + mid + ' (' + lost + ' lost packets)');
      },
      onmessage: function (msg, jsep) {
        window.Janus.debug(' ::: Got a message (subscriber) :::', msg);
        const event = msg['videoroom'];
        window.Janus.debug('Event: ' + event);
        if (msg['error']) {
          window.Janus.error(msg['error']);
        } else if (event) {
          if (event === 'attached') {
            // Now we have a working subscription, next requests will update this one
            self.creatingSubscription = false;
            window.Janus.log('Successfully attached to feed in room ' + msg['room']);
          } else if (event === 'event') {
            // Check if we got an event on a simulcast-related event from this publisher
            const mid = msg['mid'];
            const substream = msg['substream'];
            const temporal = msg['temporal'];
            if ((substream !== null && substream !== undefined) ||
                (temporal !== null && temporal !== undefined)) {
              // Check which this feed this refers to
              const sub = self.subStreams[mid];
              const feed = self.feedStreams[sub.feed_id];
              if (!self.simulcastStarted[sub.feed_id]) {
                self.simulcastStarted[sub.feed_id] = true;
              }

              // Check the substream
              const index = feed;
              if (substream === 0) {
                window.Janus.log('Switched simulcast substream! (lower quality)', null, {timeOut: 2000});
              } else if (substream === 1) {
                window.Janus.log('Switched simulcast substream! (normal quality)', null, {timeOut: 2000});
              } else if (substream === 2) {
                window.Janus.log('Switched simulcast substream! (higher quality)', null, {timeOut: 2000});
              }
              // Check the temporal layer
              if (temporal === 0) {
                window.Janus.log('Capped simulcast temporal layer! (lowest FPS)', null, {timeOut: 2000});
              } else if (temporal === 1) {
                window.Janus.log('Capped simulcast temporal layer! (medium FPS)', null, {timeOut: 2000});
              } else if (temporal === 2) {
                window.Janus.log('Capped simulcast temporal layer! (highest FPS)', null, {timeOut: 2000});
              }
            }
          } else {
            window.Janus.log('What has just happened?');
          }
        }
        if (msg['streams']) {
          // Update map of subscriptions by mid
          for (const i in msg['streams']) {
            const mid = msg['streams'][i]['mid'];
            self.subStreams[mid] = msg['streams'][i];
          }
        }
        if (jsep) {
          window.Janus.debug('Handling SDP as well...', jsep);
          // Answer and attach
          self.remoteFeed.createAnswer({
            jsep: jsep,
            // We only specify data channels here, as this way in
            // case they were offered we'll enable them. Since we
            // don't mention audio or video tracks, we autoaccept them
            // as recvonly (since we won't capture anything ourselves)
            tracks: [
              { type: 'data' }
            ],
            success: function (jsep) {
              window.Janus.debug('Got SDP!');
              window.Janus.debug(jsep);
              const body = { request: 'start', room: self.room };
              self.remoteFeed.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              window.Janus.error('WebRTC error:', error);
            }
          });
        }
      },
      onlocaltrack: function (track, on) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotetrack: function (track, mid, on) {
        window.Janus.debug('Remote track (mid=' + mid + ') ' + (on ? 'added' : 'removed') + ':', track);
        // Which publisher are we getting on this mid?
        const sub = self.subStreams[mid];
        const feed = self.feedStreams[sub.feed_id];
        window.Janus.debug(' >> This track is coming from feed ' + sub.feed_id + ':', feed);
        if (on) {
          if (sub.feed_id == self.id) {
            window.Janus.log('This is us, skipping...');
          }

          window.Janus.log('We have a track!', sub, track);

          self._addTrack(feed, track);
        }

      },
      oncleanup: function () {
        window.Janus.log(' ::: Got a cleanup notification (remote feed) :::');
        for (const i in self.feeds) {
          if (self.bitrateTimer[i]) {
            clearInterval(self.bitrateTimer[i]);
          }
          self.bitrateTimer[i] = null;
          self.feedStreams[i].simulcastStarted = false;
        }
        self.remoteTracks = {};
      }
    });
  },

  _connect: function () {
    const self = this;

    // Initialize the library (all console debuggers enabled)
    window.Janus.init({
      debug: this.debug,
      callback: function () {
        // Make sure the browser supports WebRTC
        if (!window.Janus.isWebrtcSupported()) {
          window.Janus.error('No WebRTC support... ');
          return;
        }
        // Create session
        self.janus = new Janus(
          {
            server: self.URI,
            iceServers: null,
            // Should the Janus API require authentication, you can specify either the API secret or user token here too
            //token: 'mytoken',
            //or
            //apisecret: 'serversecret',
            success: function () {
              // Attach to VideoRoom plugin
              self.janus.attach(
                {
                  plugin: 'janus.plugin.videoroom',
                  opaqueId: self.display,
                  success: function (pluginHandle) {
                    self.pluginHandle = pluginHandle;
                    window.Janus.log('Plugin attached! (' + self.pluginHandle.getPlugin() + ', id=' + self.pluginHandle.getId() + ')');
                    window.Janus.log('  -- This is a publisher/manager');
                    const register = {
                      request: 'join',
                      room: self.room,
                      pin: self.pin,
                      ptype: 'publisher',
                      display: self.display
                    };
                    if (self.id) {
                      register.id = self.id;
                    }
                    self.pluginHandle.send({ message: register });
                  },
                  error: function (error) {
                    window.Janus.error('  -- Error attaching plugin...', error);
                  },
                  consentDialog: function (on) {
                    window.Janus.debug('Consent dialog should be ' + (on ? 'on' : 'off') + ' now');
                  },
                  iceState: function (state) {
                    window.Janus.log('ICE state changed to ' + state);
                  },
                  mediaState: function (medium, on, mid) {
                    window.Janus.log('Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium + ' (mid=' + mid + ')');
                  },
                  webrtcState: function (on) {
                    window.Janus.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
                  },
                  slowLink: function (uplink, lost, mid) {
                    window.Janus.warn('Janus reports problems ' + (uplink ? 'sending' : 'receiving') +
                                      ' packets on mid ' + mid + ' (' + lost + ' lost packets)');
                  },
                  onmessage: function (msg, jsep) {
                    window.Janus.debug(' ::: Got a message (publisher) :::', msg);
                    const event = msg['videoroom'];
                    window.Janus.debug('Event: ' + event);
                    if (event != undefined && event != null) {
                      if (event === 'joined') {
                        // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                        self.id = msg['id'];
                        self.privateId = msg['private_id'];
                        window.Janus.log('Successfully joined room ' + msg['room'] + ' with ID ' + self.id);
                        self._publishOwnFeed();
                        // Any new feed to attach to?
                        if (msg['publishers']) {
                          const list = msg['publishers'];
                          window.Janus.debug('Got a list of available publishers/feeds:', list);
                          const sources = [];
                          for (const f in list) {
                            if (list[f]['dummy']) {
                              continue;
                            }
                            const id = list[f]['id'];
                            const display = list[f]['display'];
                            const streams = list[f]['streams'];
                            for (const i in streams) {
                              const stream = streams[i];
                              stream['id'] = id;
                              stream['display'] = display;
                            }
                            self.feedStreams[id] = {
                              id: id,
                              display: display,
                              streams: streams
                            }
                            window.Janus.debug('  >> [' + id + '] ' + display + ':', streams);
                            sources.push(streams);
                          }
                          if (sources.length > 0) {
                            self._subscribeTo(sources);
                          }
                        }
                      } else if (event === 'destroyed') {
                        // The room has been destroyed
                        window.Janus.warn('The room has been destroyed!');
                        window.location.reload();
                      } else if (event === 'event') {
                        // Any info on our streams or a new feed to attach to?
                        if (msg['streams']) {
                          const streams = msg['streams'];
                          for (const i in streams) {
                            const stream = streams[i];
                            stream['id'] = self.id;
                            stream['display'] = self.display;
                          }
                          self.feedStreams[self.id] = {
                            id: self.id,
                            display: self.display,
                            streams: streams
                          }
                        } else if (msg['publishers']) {
                          const list = msg['publishers'];
                          window.Janus.debug('Got a list of available publishers/feeds:', list);
                          const sources = [];
                          for (const f in list) {
                            if (list[f]['dummy']) {
                              continue;
                            }
                            const id = list[f]['id'];
                            const display = list[f]['display'];
                            const streams = list[f]['streams'];
                            for (const i in streams) {
                              const stream = streams[i];
                              stream['id'] = id;
                              stream['display'] = display;
                            }
                            self.feedStreams[id] = {
                              id: id,
                              display: display,
                              streams: streams
                            }
                            window.Janus.debug('  >> [' + id + '] ' + display + ':', streams);
                            sources.push(streams);
                          }
                          if (sources.length > 0) {
                            self._subscribeTo(sources);
                          }
                        } else if (msg['leaving']) {
                          // One of the publishers has gone away?
                          const leaving = msg['leaving'];
                          window.Janus.log('Publisher left: ' + leaving);
                          self._unsubscribeFrom(leaving);
                        } else if (msg['unpublished']) {
                          // One of the publishers has unpublished?
                          const unpublished = msg['unpublished'];
                          window.Janus.log('Publisher left: ' + unpublished);
                          if (unpublished === 'ok') {
                            // That's us
                            self.pluginHandle.hangup();
                            return;
                          }
                          self._unsubscribeFrom(unpublished);
                        } else if (msg['error']) {
                          if (msg['error_code'] === 426) {
                            window.Janus.error('No such room!');
                          } else {
                            window.Janus.error(msg['error']);
                          }
                        }
                      }
                    }
                    if (jsep) {
                      window.Janus.debug('Handling SDP as well...', jsep);
                      self.pluginHandle.handleRemoteJsep({ jsep: jsep });
                      //
                      // We could tell here if your codec was rejected
                      //
                    }
                  },
                  onlocaltrack: function (track, on) {
                    window.Janus.debug(' ::: Got a local track event :::');
                    window.Janus.debug('Local track ' + (on ? 'added' : 'removed') + ':', track);
                    // When our local track is audio (in theory,
                    // always), we attach an audio listener to our
                    // element so that we can notify other entities
                    // about our own noise.
                    if (track.kind === 'audio') {
                      self.el.setAttribute('mediastream-listener', '');
                      self.el.components['mediastream-listener'].setMediaStream(new MediaStream([track]));
                    }
                  },
                  onremotetrack: function (track, mid, on) {
                    // The publisher stream is sendonly, we don't expect anything here
                  },
                  oncleanup: function () {
                    window.Janus.log(' ::: Got a cleanup notification: we are unpublished now :::');
                    delete self.feedStreams[self.id];
                  }
                });
            },
            error: function (error) {
              window.Janus.error(error);
              window.location.reload();
            },
            destroyed: function () {
              window.location.reload();
            }
          });
      }
    });

    //
    // We might have gotten the tracks already for element that are
    // still not part of the scene. We detect whenever a new element
    // is attached to the scene, check if this has tracks belonging to
    // it and attach them.
    //
    this.el.sceneEl.addEventListener('child-attached', function (e) {
      const element = e.detail.el;
      const tracks = self.remoteTracks[element.id];
      if (tracks) {
        e.detail.el.addEventListener('loaded', function (e) {
          for (const track of tracks) {
            self._attachTrack(element, track);
          }
        });
      }
    });
  }
});

/**
 * OpenACS Networked A-Frame
 *
 * These components connect to the OpenACS websocket backend (or any
 * backend implementing the same message protocol) and provides the
 * api to create "shared" objects in the context of a subscription (or
 * "room"). Changes on the objects are broadcasted and reflected the
 * same for every participant.
 * The name is a not-so-subtle reference to another much better
 * engineered project with the same purposes based on NodeJS:
 * https://github.com/networked-aframe/networked-aframe
 */
window.AFRAME.registerSystem('oacs-networked-scene', {
  schema: {
    wsURI: {type: 'string'}
  },

  init: function () {
    if (!this.data.wsURI) {
      this.wsURI = this._defaultWsURI();
    } else {
      this.wsURI = this.data.wsURI;
    }
    this.sceneEl = this.el.sceneEl;

    //
    // We connect to the backend once the scene has completely loaded.
    //
    this.sceneEl.addEventListener('loaded', this._connect.bind(this), {once: true});

    this.isHeadset = window.AFRAME.utils.device.checkHeadsetConnected();

    this._addDelegatedListeners();

    this.messageQueue = [];

    this._privateProperties = ['id', 'type'];

    this.grabEvent = new Event('grab', {bubbles: true});
    this.releaseEvent = new Event('release', {bubbles: true});
  },

  msgObject: function () {
    //
    // Utility to reuse the single message object.
    //
    if (!this.message) {
        this.message = {};
    }
    for (const k in this.message) {
      delete this.message[k];
    }
    return this.message;
  },

  remove: function () {
    if (this.websocket) {
      this.websocket.close();
    }
  },

  send: function (data) {
    if (this.websocket && this.websocket.readyState === window.WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(Object.assign({}, data));
    }
  },

  grab: function (id) {
    //
    // Attempt obtaining control over a networked entity.
    //
    const msg = this.msgObject();
    msg.id = id;
    msg.type = 'release';
    this.send(msg);
  },

  release: function (id) {
    //
    // Attempt relinquishing control over a networked entity.
    //
    const msg = this.msgObject();
    msg.id = id;
    msg.type = 'grab';
    this.send(msg);
  },

  _clear: function () {
    //
    // Cleanup all our networked entities. Invoked before leaving a VR
    // experience.
    //
    for (const e of document.querySelectorAll('[oacs-networked-entity]')) {
      e.components['oacs-networked-entity'].delete();
    }
  },

  _addDelegatedListeners: function () {
    const self = this;
    window.addEventListener('entityChanged', function (e) {
      const component = e.target.components['oacs-networked-entity'];
      if (component) {
        const msg = self.msgObject();
        msg.id = component.networkId;
        msg.type = 'update';
        const changedProperties = e.target.components['oacs-change-listener'].changedProperties;
        Object.assign(msg, changedProperties);
        self.send(msg);
      }
    });

    if (this.isHeadset) {
      //
      // window.onbeforeunload is not triggered easily on e.g. oculus,
      // because one does seldom close the app explicitly. We delete
      // the avatar also on exit of immersive mode.
      //
      window.addEventListener('exit-vr', this._clear);

      //
      // On a headset, all networked entities that are not hands will
      // be generated upon entering immersive mode.
      //
      window.addEventListener('enter-vr', function (e) {
        const entities = document.querySelectorAll('[oacs-networked-entity]:not([hand-controls])');
        for (const e of entities) {
          e.components['oacs-networked-entity'].attach();
        }
      });

      //
      // Not all clients will support controllers, therefore, we attach
      // the hands to the network only upon controller connection.
      //
      window.addEventListener('controllerconnected', function (e) {
        const component = e.target.components['oacs-networked-entity'];
        if (component && e.target.getAttribute('hand-controls')) {
          component.attach();
        }
      });
    }

    //
    // When the page is closed, clear our stuff.
    //
    window.addEventListener('beforeunload', this._clear);
  },

  _defaultWsURI: function () {
    const proto = window.location.protocol;
    const host = window.location.host;
    return (proto === 'https:' ? 'wss:' : 'ws:') + '//' + host + '/aframe-vr/connect';
  },

  _create: function (data) {
    // Create an item locally
    let el = document.getElementById(data.id);
    if (el) {
      this._update(el, data);
      console.log('Element already exists. Updating instead.', el, data);
    } else if (data.template) {
      this.sceneEl.insertAdjacentHTML('beforeend', data.template);
      const template = this.sceneEl.lastElementChild;
      el = template.content.firstElementChild.cloneNode(true);
      el.setAttribute('id', data.id);
      //
      // Ensure entity is visible only in its final, updated state
      // by toggling visibility.
      //
      el.setAttribute('visible', false);
      this.sceneEl.appendChild(el);
      this._update(el, data);
      el.setAttribute('visible', true);
      console.log('Element created', el, data);
    } else {
      console.log('No template for this element. Skipping.', data);
    }
    return el;
  },

  _update: function (el, data) {
    //
    // Update an item locally.
    //

    //
    // Get private properties out of the way
    //
    for (const p of this._privateProperties) {
      delete data[p];
    }
    //
    // The gesture property is applied on a special component.
    //
    if (data.gesture) {
      el.setAttribute('remote-hand-controls', 'gesture', data.gesture);
      delete data.gesture;
    }
    //
    // A property is by default set by its attribute name on the
    // element. Optionally, one can specify a data-#property name#
    // attribute on a child element in the template to say that this
    // is the element where the property should be updated. The value
    // of this attribute tells which is the real attribute we should
    // change.
    //
    for (const d of el.querySelectorAll('*')) {
      for (const property in data) {
        if (typeof d.dataset[property] !== 'undefined') {
          const att = d.dataset[property] === '' ? property : d.dataset[property];
          d.setAttribute(att, data[property]);
          delete data[property];
        }
      }
    }
    //
    // All remaining properties are set on the entity directly.
    //
    for (const property in data) {
      el.setAttribute(property, data[property]);
    }
  },

  _delete: function (data) {
    // Delete an item locally
    const el = document.getElementById(data.id);
    if (!el) return;
    el.parentElement.removeChild(el);
  },

  _onMessage: function (e) {
    // Handle the different kinds of websocket events
    const m = JSON.parse(e.data);
    switch (m.type) {
      case 'create':
        this._onRemoteCreate(m);
        break;
      case 'created':
        this._onRemoteCreated(m);
        break;
      case 'delete':
        this._onRemoteDelete(m);
        break;
      case 'update':
        this._onRemoteUpdate(m);
        break;
      case 'release':
        this._onRemoteRelease(m);
        break;
      case 'grab':
        this._onRemoteGrab(m);
        break;
      default:
        console.error('Invalid message type: ' + m.type);
    }
  },

  _onRemoteCreate: function (data) {
    // React to create notification by creating the item
    // locally
    this._create(data);
  },

  _onRemoteCreated: function (data) {
    //
    // We received confermation that our entity was created. Now we
    // can start to display it.
    //
    document.getElementById(data.id)?.setAttribute('visible', true);
  },

  _onRemoteUpdate: function (data) {
    // React to update notification by updating the local
    // item
    const el = document.getElementById(data.id);
    if (!el || el.sceneEl !== this.sceneEl) return;
    this._update(el, data);
  },

  _onRemoteDelete: function (data) {
    // React to delete notification by deleting the local
    // item
    this._delete(data);
  },

  _onRemoteGrab: function (data) {
    //
    // Entity was given back to us. Restart syncronizing its status
    // with the network and notify the scene.
    //
    const grabbedEntity = document.getElementById(data.id);
    if (grabbedEntity &&
        grabbedEntity.components &&
        grabbedEntity.components['oacs-networked-entity']) {
      grabbedEntity.components['oacs-networked-entity'].play();
      grabbedEntity.dispatchEvent(this.grabEvent);
    }
  },

  _onRemoteRelease: function (data) {
    //
    // We were asked to relinquish control over this entity. Stop
    // sending our own status, get status from the network and notify
    // the scene.
    //
    const releasedEntity = document.getElementById(data.id);
    if (releasedEntity &&
        releasedEntity.components &&
        releasedEntity.components['oacs-networked-entity']) {
      releasedEntity.components['oacs-networked-entity'].pause();
      releasedEntity.setAttribute('visible', true);
      this._update(releasedEntity, data);
      releasedEntity.dispatchEvent(this.releaseEvent);
    }
  },

  _connect: function () {
    const self = this;
    this.websocket = new window.WebSocket(this.wsURI);

    this.websocket.onopen = function (e) {
      //
      // Send the messages we have queued so far.
      //
      while (self.messageQueue.length > 0) {
        self.send(self.messageQueue.shift());
      }
    };
    this.websocket.addEventListener('close', function (e) {
      console.log('Disconnected.');
    });
    this.websocket.addEventListener('message', function (e) {
      self._onMessage(e);
    });
    this.websocket.addEventListener('error', function (e) {
      console.error(e.data);
    });

    setInterval(function () {
      if (self.websocket.readyState === window.WebSocket.OPEN) {
        self.websocket.send('ping');
      } else {
        console.warn('Not connected, attempting reconnection...');
        self._connect();
      }
    }, 60000);
  }
});

window.AFRAME.registerComponent('oacs-networked-entity', {
  schema: {
    networkId: {type: 'string'},
    template: {type: 'string'},
    color: {type: 'color', default: ''},
    randomColor: {type: 'boolean', default: false},
    permanent: {type: 'boolean', default: false},
    properties: { type: 'array', default: 'position, rotation' },
    name: {default: ''}
  },

  init: function () {
    //
    // A networked entity starts invisible and becomes visible only
    // when the backed confirms its creation. This is to avoid the
    // entity starting its local behavior before we realize it is
    // actually already taken and should use its remote one.
    //
    this.el.setAttribute('visible', false);

    this.networkedScene = this.el.sceneEl.systems['oacs-networked-scene'];

    if (this.data.template) {
      //
      // The template is serialized and sent in full to the
      // peers. This enables to spawn arbitrary entities.
      //
      this.template = document.querySelector(this.data.template).outerHTML;
    }

    this.networkId = this.data.networkId ? this.data.networkId : this.el.getAttribute('id');
    this.name = this.data.name;
    this.permanent = this.data.permanent;

    if (this.data.randomColor) {
      this.color = '#' + Math.random().toString(16).substr(2, 6);
    } else {
      this.color = this.data.color;
    }

    this.properties = this.data.properties;

    this.isAttached = false;

    //
    // Headsets and hands are attached reacting to their special
    // events by the scene. In regular cases, we can attach the entity
    // right away.
    //
    if (!this.networkedScene.isHeadset &&
        !this.el.getAttribute('hand-controls')) {
      this.attach();
    }
  },

  pause: function () {
    //
    // Shuts down event generation on changes
    //
    this.el.removeAttribute('oacs-change-listener');
  },

  play: function () {
    //
    // Start event generation on changes
    //
    if (this.isAttached) {
      this.el.setAttribute('oacs-change-listener', 'properties', this.properties);
    }
  },

  delete: function () {
    //
    // Delete the entity only if we are currently in charge of it.
    //
    if (this.isPlaying) {
      const msg = this.networkedScene.msgObject();
      msg.id = this.networkId;
      msg.type = this.permanent ? 'grab' : 'delete';
      this.networkedScene.send(msg);
    }
  },

  attach: function () {
    const msg = this.networkedScene.msgObject();
    msg.id = this.networkId;
    msg.type = 'create';
    msg.name = this.name;
    msg.color = this.color
    if (this.template) {
      msg.template = this.template;
    }
    this.networkedScene.send(msg);
    this.isAttached = true;
    this.play();
  }
});

//
// Local variables:
//    mode: javascript
//    js-indent-level: 2
//    indent-tabs-mode: nil
// End:
//