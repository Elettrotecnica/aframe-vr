/**
 * A simple component to listen to absolute position changes and
 * trigger an event other components can listen and react to.
 *
 * The reason why we listen to the absolute position instead than the
 * default position property is that this enables the use case of
 * entities such as the camera enclosed inside a camera rig. If we
 * rotate the rig, the position property of the enclosed entity
 * would not change.
*/
window.AFRAME.registerComponent('absolute-position-listener', {
  tick: function () {
    const newValue = this._getAbsolutePosition();
    const stringCoords = window.AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastPosition !== stringCoords) {
      this.el.emit('absolutePositionChanged', newValue);
      this.lastPosition = stringCoords;
    }
  },
  _getAbsolutePosition: (function () {
    const newValue = {'x': 0, 'y': 0, 'z': 0};
    return function () {
      // Note that we cannot use a getWorldPosition stunt here,
      // because various compensations are applied only to the
      // relative position depending on the device.
      newValue.x = 0;
      newValue.y = 0;
      newValue.z = 0;
      var el = this.el;
      while (el && el.object3D && el !== this.el.sceneEl) {
        newValue.x += el.object3D.position.x;
        newValue.y += el.object3D.position.y;
        newValue.z += el.object3D.position.z;
        el = el.parentElement;
      }
      return newValue;
    };
  })()
});

/**
 * A simple component to listen to absolute rotation changes and
 * trigger an event other components can listen and react to.
 *
 * The reason why we listen to the absolute rotation instead than the
 * default rotation property is that this enables the use case of
 * entities such as the camera enclosed inside a camera rig. If we
 * rotate the rig, the rotation property of the enclosed entity
 * would not change.
*/
window.AFRAME.registerComponent('absolute-rotation-listener', {
  tick: function () {
    const newValue = this._getAbsoluteRotation();
    const stringCoords = window.AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastRotation !== stringCoords) {
      this.el.emit('absoluteRotationChanged', newValue);
      this.lastRotation = stringCoords;
    }
  },
  _getAbsoluteRotation: (function () {
    const newValue = {'x': 0, 'y': 0, 'z': 0};
    return function () {
      // Note that we cannot use a getWorldQuaternion stunt here,
      // because various compensations are applied only to the relative
      // rotation depending on the device.
      newValue.x = 0;
      newValue.y = 0;
      newValue.z = 0;
      var el = this.el;
      while (el && el.object3D && el !== this.el.sceneEl) {
        newValue.x += el.object3D.rotation.x;
        newValue.y += el.object3D.rotation.y;
        newValue.z += el.object3D.rotation.z;
        el = el.parentElement;
      }
      newValue.x = THREE.MathUtils.radToDeg(newValue.x);
      newValue.y = THREE.MathUtils.radToDeg(newValue.y);
      newValue.z = THREE.MathUtils.radToDeg(newValue.z);
      return newValue;
    };
  })()
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
      this.el.emit('sound-source-removed', { soundSource: this.soundSource });
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
    this.el.emit('sound-source-set', { soundSource: this.soundSource });
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
    this.loudItems = {};
    let self = this;
    this.el.sceneEl.addEventListener('mediastream-listener-loud', function (e) {
      self.loudItems[e.detail.el] = e.detail;
    });
    this.el.sceneEl.addEventListener('mediastream-listener-silent', function (e) {
      if (self.loudItems[e.detail.el]) {
        self.loudItems[e.detail.el].delete;
      }
    });
  },

  tick: function () {
    if (!this.stream) return;
    let loudness = this._getLoudness();
    if (loudness > 127) {
      if (!this.isMakingNoise) {
        this.el.sceneEl.emit('mediastream-listener-loud', {
          el: this.el,
          loudness: loudness
        });
        console.log('sound');
        this.isMakingNoise = true;
      }
    } else if (this.isMakingNoise) {
      this.el.sceneEl.emit('mediastream-listener-silent', {
        el: this.el
      });
      console.log('no sound');
      this.isMakingNoise = false;
    }
  },

  // Returns the "loudest" sound from the perspective of this element.
  listen: function () {
    let maxNoise = 0;
    let maxItem = null;

    for (let key in this.loudItems) {
      let e = this.loudItems[key].el;
      if (e === this.el) continue;
      let loudness = this.loudItems[key].loudness;
      let myPosition = this.el.object3D.position;
      let soundPosition = e.object3D.position;
      let distance = myPosition.distanceTo(soundPosition);
      // We use an inverse quadratic attenuation based on the
      // distance.
      let noise = loudness / distance ** 2;
      if (noise > 0 && noise > maxNoise) {
        maxNoise = noise;
        maxItem = e;
      }
    }

    return maxItem;
  },

  // Returns our loudness as a number between 0 and 255
  _getLoudness: function () {
    let maxByteFrequencyData = 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    for (let d of this.dataArray) {
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
    var el;
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
    var self = this;
    var el = this.el;

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

    var src = this.data.model;
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

        this.setAttribute('absolute-position-listener', '');
        this.addEventListener('absolutePositionChanged', function () {
          self.idle = self.idleTimeout;
        });
        this.setAttribute('absolute-rotation-listener', '');
        this.addEventListener('absoluteRotationChanged', function () {
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
 * Hand controls component that abstracts 6DoF controls:
 *   oculus-touch-controls, vive-controls, windows-motion-controls.
 *
 * Originally meant to be a sample implementation of applications-specific controls that
 * abstracts multiple types of controllers.
 *
 * Auto-detect appropriate controller.
 * Handle common events coming from the detected vendor-specific controls.
 * Translate button events to semantic hand-related event names:
 *   (gripclose, gripopen, thumbup, thumbdown, pointup, pointdown)
 * Load hand model with gestures that are applied based on the button pressed.
 *
 * @property {string} Hand mapping (`left`, `right`).
 */
window.AFRAME.registerComponent('local-hand-controls', {
  schema: {
    color: {default: 'white', type: 'color'},
    hand: { default: 'left' },
    handModelStyle: {default: 'lowPoly', oneOf: ['lowPoly', 'highPoly', 'toon']}
  },

  init: function () {
    var self = this;
    var el = this.el;
    // Current pose.
    this.gesture = ANIMATIONS.open;
    // Active buttons populated by events provided by the attached controls.
    this.pressedButtons = {};
    this.touchedButtons = {};
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin('anonymous');

    this.onGripDown = function () { self.handleButton('grip', 'down'); };
    this.onGripUp = function () { self.handleButton('grip', 'up'); };
    this.onTrackpadDown = function () { self.handleButton('trackpad', 'down'); };
    this.onTrackpadUp = function () { self.handleButton('trackpad', 'up'); };
    this.onTrackpadTouchStart = function () { self.handleButton('trackpad', 'touchstart'); };
    this.onTrackpadTouchEnd = function () { self.handleButton('trackpad', 'touchend'); };
    this.onTriggerDown = function () { self.handleButton('trigger', 'down'); };
    this.onTriggerUp = function () { self.handleButton('trigger', 'up'); };
    this.onTriggerTouchStart = function () { self.handleButton('trigger', 'touchstart'); };
    this.onTriggerTouchEnd = function () { self.handleButton('trigger', 'touchend'); };
    this.onGripTouchStart = function () { self.handleButton('grip', 'touchstart'); };
    this.onGripTouchEnd = function () { self.handleButton('grip', 'touchend'); };
    this.onThumbstickDown = function () { self.handleButton('thumbstick', 'down'); };
    this.onThumbstickUp = function () { self.handleButton('thumbstick', 'up'); };
    this.onAorXTouchStart = function () { self.handleButton('AorX', 'touchstart'); };
    this.onAorXTouchEnd = function () { self.handleButton('AorX', 'touchend'); };
    this.onBorYTouchStart = function () { self.handleButton('BorY', 'touchstart'); };
    this.onBorYTouchEnd = function () { self.handleButton('BorY', 'touchend'); };
    this.onSurfaceTouchStart = function () { self.handleButton('surface', 'touchstart'); };
    this.onSurfaceTouchEnd = function () { self.handleButton('surface', 'touchend'); };
    this.onControllerConnected = this.onControllerConnected.bind(this);
    this.onControllerDisconnected = this.onControllerDisconnected.bind(this);

    el.addEventListener('controllerconnected', this.onControllerConnected);
    el.addEventListener('controllerdisconnected', this.onControllerDisconnected);

    // Hidden by default.
    el.object3D.visible = false;
  },

  play: function () {
    this.addEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  tick: function (time, delta) {
    var mesh = this.el.getObject3D('mesh');

    if (!mesh || !mesh.mixer) { return; }

    mesh.mixer.update(delta / 1000);
  },

  onControllerConnected: function () {
    this.el.object3D.visible = true;
  },

  onControllerDisconnected: function () {
    this.el.object3D.visible = false;
  },

  addEventListeners: function () {
    var el = this.el;
    el.addEventListener('gripdown', this.onGripDown);
    el.addEventListener('gripup', this.onGripUp);
    el.addEventListener('trackpaddown', this.onTrackpadDown);
    el.addEventListener('trackpadup', this.onTrackpadUp);
    el.addEventListener('trackpadtouchstart', this.onTrackpadTouchStart);
    el.addEventListener('trackpadtouchend', this.onTrackpadTouchEnd);
    el.addEventListener('triggerdown', this.onTriggerDown);
    el.addEventListener('triggerup', this.onTriggerUp);
    el.addEventListener('triggertouchstart', this.onTriggerTouchStart);
    el.addEventListener('triggertouchend', this.onTriggerTouchEnd);
    el.addEventListener('griptouchstart', this.onGripTouchStart);
    el.addEventListener('griptouchend', this.onGripTouchEnd);
    el.addEventListener('thumbstickdown', this.onThumbstickDown);
    el.addEventListener('thumbstickup', this.onThumbstickUp);
    el.addEventListener('abuttontouchstart', this.onAorXTouchStart);
    el.addEventListener('abuttontouchend', this.onAorXTouchEnd);
    el.addEventListener('bbuttontouchstart', this.onBorYTouchStart);
    el.addEventListener('bbuttontouchend', this.onBorYTouchEnd);
    el.addEventListener('xbuttontouchstart', this.onAorXTouchStart);
    el.addEventListener('xbuttontouchend', this.onAorXTouchEnd);
    el.addEventListener('ybuttontouchstart', this.onBorYTouchStart);
    el.addEventListener('ybuttontouchend', this.onBorYTouchEnd);
    el.addEventListener('surfacetouchstart', this.onSurfaceTouchStart);
    el.addEventListener('surfacetouchend', this.onSurfaceTouchEnd);
  },

  removeEventListeners: function () {
    var el = this.el;
    el.removeEventListener('gripdown', this.onGripDown);
    el.removeEventListener('gripup', this.onGripUp);
    el.removeEventListener('trackpaddown', this.onTrackpadDown);
    el.removeEventListener('trackpadup', this.onTrackpadUp);
    el.removeEventListener('trackpadtouchstart', this.onTrackpadTouchStart);
    el.removeEventListener('trackpadtouchend', this.onTrackpadTouchEnd);
    el.removeEventListener('triggerdown', this.onTriggerDown);
    el.removeEventListener('triggerup', this.onTriggerUp);
    el.removeEventListener('triggertouchstart', this.onTriggerTouchStart);
    el.removeEventListener('triggertouchend', this.onTriggerTouchEnd);
    el.removeEventListener('griptouchstart', this.onGripTouchStart);
    el.removeEventListener('griptouchend', this.onGripTouchEnd);
    el.removeEventListener('thumbstickdown', this.onThumbstickDown);
    el.removeEventListener('thumbstickup', this.onThumbstickUp);
    el.removeEventListener('abuttontouchstart', this.onAorXTouchStart);
    el.removeEventListener('abuttontouchend', this.onAorXTouchEnd);
    el.removeEventListener('bbuttontouchstart', this.onBorYTouchStart);
    el.removeEventListener('bbuttontouchend', this.onBorYTouchEnd);
    el.removeEventListener('xbuttontouchstart', this.onAorXTouchStart);
    el.removeEventListener('xbuttontouchend', this.onAorXTouchEnd);
    el.removeEventListener('ybuttontouchstart', this.onBorYTouchStart);
    el.removeEventListener('ybuttontouchend', this.onBorYTouchEnd);
    el.removeEventListener('surfacetouchstart', this.onSurfaceTouchStart);
    el.removeEventListener('surfacetouchend', this.onSurfaceTouchEnd);
  },

  /**
   * Update handler. More like the `init` handler since the only property is the hand, and
   * that won't be changing much.
   */
  update: function (previousHand) {
    var controlConfiguration;
    var el = this.el;
    var hand = this.data.hand;
    var handModelStyle = this.data.handModelStyle;
    var handColor = this.data.color;
    var self = this;

    // Get common configuration to abstract different vendor controls.
    controlConfiguration = {
      hand: hand,
      model: false
    };

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
        el.setAttribute('magicleap-controls', controlConfiguration);
        el.setAttribute('vive-controls', controlConfiguration);
        el.setAttribute('oculus-touch-controls', controlConfiguration);
        el.setAttribute('windows-motion-controls', controlConfiguration);
        el.setAttribute('hp-mixed-reality-controls', controlConfiguration);
      });
    }
  },

  remove: function () {
    this.el.removeObject3D('mesh');
  },

  /**
   * Play model animation, based on which button was pressed and which kind of event.
   *
   * 1. Process buttons.
   * 2. Determine gesture (this.determineGesture()).
   * 3. Animation gesture (this.animationGesture()).
   * 4. Emit gesture events (this.emitGestureEvents()).
   *
   * @param {string} button - Name of the button.
   * @param {string} evt - Type of event for the button (i.e., down/up/touchstart/touchend).
   */
  handleButton: function (button, evt) {
    var lastGesture;
    var isPressed = evt === 'down';
    var isTouched = evt === 'touchstart';

    // Update objects.
    if (evt.indexOf('touch') === 0) {
      // Update touch object.
      if (isTouched === this.touchedButtons[button]) { return; }
      this.touchedButtons[button] = isTouched;
    } else {
      // Update button object.
      if (isPressed === this.pressedButtons[button]) { return; }
      this.pressedButtons[button] = isPressed;
    }

    // Determine the gesture.
    lastGesture = this.gesture;
    this.gesture = this.determineGesture();

    // Same gesture.
    if (this.gesture === lastGesture) { return; }
    // Animate gesture.
    this.animateGesture(this.gesture, lastGesture);

    // Emit events.
    this.emitGestureEvents(this.gesture, lastGesture);
  },

  /**
   * Determine which pose hand should be in considering active and touched buttons.
   */
  determineGesture: function () {
    var gesture;
    var isGripActive = this.pressedButtons.grip;
    var isSurfaceActive = this.pressedButtons.surface || this.touchedButtons.surface;
    var isTrackpadActive = this.pressedButtons.trackpad || this.touchedButtons.trackpad;
    var isTriggerActive = this.pressedButtons.trigger || this.touchedButtons.trigger;
    var isABXYActive = this.touchedButtons.AorX || this.touchedButtons.BorY;
    var isVive = isViveController(this.el.components['tracked-controls']);

    // Works well with Oculus Touch and Windows Motion Controls, but Vive needs tweaks.
    if (isVive) {
      if (isGripActive || isTriggerActive) {
        gesture = ANIMATIONS.fist;
      } else if (isTrackpadActive) {
        gesture = ANIMATIONS.point;
      }
    } else {
      if (isGripActive) {
        if (isSurfaceActive || isABXYActive || isTrackpadActive) {
          gesture = isTriggerActive ? ANIMATIONS.fist : ANIMATIONS.point;
        } else {
          gesture = isTriggerActive ? ANIMATIONS.thumbUp : ANIMATIONS.pointThumb;
        }
      } else if (isTriggerActive) {
        gesture = ANIMATIONS.hold;
      }
    }

    return gesture;
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
   * @param {string} gesture - Which pose to animate to. If absent, then animate to open.
   * @param {string} lastGesture - Previous gesture, to reverse back to open if needed.
   */
  animateGesture: function (gesture, lastGesture) {
    if (gesture) {
      this.playAnimation(gesture || ANIMATIONS.open, lastGesture, false);
      return;
    }

    // If no gesture, then reverse the current gesture back to open pose.
    this.playAnimation(lastGesture, lastGesture, true);
  },

  /**
   * Emit `hand-controls`-specific events.
   */
  emitGestureEvents: function (gesture, lastGesture) {
    var el = this.el;
    var eventName;

    if (lastGesture === gesture) { return; }

    // Emit event for lastGesture not inactive.
    eventName = getGestureEventName(lastGesture, false);
    if (eventName) { el.emit(eventName); }

    // Emit event for current gesture now active.
    eventName = getGestureEventName(gesture, true);
    if (eventName) { el.emit(eventName); }

    // Custom: also emit the raw gesture+lastGesture event
    // (hand-controls supports more gestures than the events it can
    // emit atm)
    el.emit('elGesture', {'gesture': gesture, 'lastGesture': lastGesture});
  },

  /**
  * Play hand animation based on button state.
  *
  * @param {string} gesture - Name of the animation as specified by the model.
  * @param {string} lastGesture - Previous pose.
  * @param {boolean} reverse - Whether animation should play in reverse.
  */
  playAnimation: function (gesture, lastGesture, reverse) {
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
    toAction.timeScale = reverse ? -1 : 1;
    toAction.time = reverse ? clip.duration : 0;
    toAction.weight = 1;

    // No gesture to gesture or gesture to no gesture.
    if (!lastGesture || gesture === lastGesture) {
      // Stop all current animations.
      mesh.mixer.stopAllAction();
      // Play animation.
      toAction.play();
      return;
    }

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
 * Suffix gestures based on toggle state (e.g., open/close, up/down, start/end).
 *
 * @param {string} gesture
 * @param {boolean} active
 */
function getGestureEventName (gesture, active) {
  var eventName;

  if (!gesture) { return; }

  eventName = EVENTS[gesture];
  if (eventName === 'grip') {
    return eventName + (active ? 'close' : 'open');
  }
  if (eventName === 'point') {
    return eventName + (active ? 'up' : 'down');
  }
  if (eventName === 'pointing' || eventName === 'pistol') {
    return eventName + (active ? 'start' : 'end');
  }
}

function isViveController (trackedControls) {
  var controller = trackedControls && trackedControls.controller;
  var isVive = controller && (controller.id && controller.id.indexOf('OpenVR ') === 0 ||
    (controller.profiles &&
     controller.profiles[0] &&
     controller.profiles[0] === 'htc-vive'));
  return isVive;
}
