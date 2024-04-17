/**
 * A component checking whether properties on an entity have
 * changed. When this happens, an entityChanged is generated reporting
 * which properties are now different. This is used to react to
 * changes, for instance sending the new properties over the network.
 */

const ENTITY_CHANGED_EVENT = new Event('entityChanged', {bubbles: true});

const _getAbsoluteRotationEuler = (function() {
  const absoluteRotationQuaternion = new THREE.Quaternion();
  const absoluteRotationEuler = new THREE.Euler();
  return function (object) {
    object.getWorldQuaternion(absoluteRotationQuaternion);
    absoluteRotationEuler.setFromQuaternion(absoluteRotationQuaternion);
    return absoluteRotationEuler;
  };
})();

window.AFRAME.registerComponent('oacs-change-listener', {
  schema: {
    properties: { type: 'array', default: ['position', 'rotation'] }
  },

  init: function () {
    this.properties = {};
    this.changedProperties = {};
    this.changeEvent = ENTITY_CHANGED_EVENT;
  },

  update: function () {
    for (const property of this.data.properties) {
      this._initPropertyValue(property);
      this._fetchPropertyValue(property);
    }
  },

  tick: function () {
    let changed = false;
    for (const property in this.properties) {
      delete this.changedProperties[property];
      //
      // Get current property value
      //
      this._fetchPropertyValue(property);
      if (this._propertyChanged(property)) {
        //
        // Collect all properties that changed
        //
        this.changedProperties[property] = this.properties[property]['new'];
        changed = true;
      }
    }
    if (changed) {
      this.el.dispatchEvent(this.changeEvent);
    }
  },

  _propertyChanged: function (property) {
    //
    // Checks whether a property has changed and updates the currently
    // known value.
    //
    let oldProperty = this.properties[property]['old'];
    const newProperty = this.properties[property]['new'];
    let changed = false;
    if (typeof newProperty === 'object') {
      //
      // For object properties, check whether any of the attributes
      // are different.
      //
      // We assume new value is the relevant value and that the
      // overall structure of the property won't change over time.
      //
      for (const attribute in newProperty) {
        changed = changed || oldProperty[attribute] !== newProperty[attribute];
        oldProperty[attribute] = newProperty[attribute];
      }
    } else {
      //
      // Value properties are simply compared.
      //
      changed = oldProperty !== newProperty;
      this.properties[property]['old'] = newProperty;
    }
    return changed;
  },

  _initPropertyValue: function (property) {
    //
    // Instantiate objects holding old and new values. Some properties
    // have special initialization.
    //
    this.properties[property] = {
      'old': {},
      'new': null
    };
    switch(property) {
      case 'position':
      case 'scale':
        this.properties[property]['new'] = new THREE.Vector3();
        break;
      case 'rotation':
         this.properties['rotation']['new'] = {};
        break;
    }
  },

  _fetchPropertyValue: function (property) {
    //
    // Fetch the current value for a property. Depending on the
    // property this may have an own implementation.
    //
    switch(property) {
      case 'position':
        this._getAbsolutePosition();
        break;
      case 'scale':
        this._getScale();
        break;
      case 'rotation':
        this._getAbsoluteRotation();
        break;
      case 'gesture':
        this._getGesture();
        break;
      default:
        //
        // By default, properties are retrieved by reading the
        // attribute on the element.
        //
        this.properties[property]['new'] = this.el.getAttribute(property);
    }
  },

  _getGesture: function () {
    const component = this.el.components['hand-controls'];
    if (component && typeof component.gesture !== 'undefined') {
      this.properties['gesture']['new'] = component.gesture;
    }
  },

  _getAbsoluteRotation: function () {
    const newValue = this.properties['rotation']['new'];
    const absoluteRotationEuler = _getAbsoluteRotationEuler(this.el.object3D);
    newValue.x = absoluteRotationEuler.x;
    newValue.y = absoluteRotationEuler.y;
    newValue.z = absoluteRotationEuler.z;
  },

  _getAbsolutePosition: function () {
    const newValue = this.properties['position']['new'];
    this.el.object3D.getWorldPosition(newValue);
  },

  _getScale: function () {
    const newValue = this.properties['scale']['new'];
    newValue.copy(this.el.object3D.scale);
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

const SOUND_EVENT = new Event('mediastream-loud');

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
    rolloffFactor: { default: 1 },
    emitSoundEvents: {type: 'boolean', default: true}
  },

  init: function () {
    this.stream = null;
    this.sound = null;
    this.audioEl = null;
  },

  update (oldData) {
    this.emitSoundEvents = this.data.emitSoundEvents;

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
    if (this.initialized) {
      this.destroySound();
      this._setupSound(stream);
    } else {
      this.el.addEventListener('componentinitialized', (evt) => {
        if (evt.detail.name === this.name && evt.detail.id === this.id) {
          this.setMediaStream(stream);
        }
      });
    }
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

    if (this.emitSoundEvents) {
      this._setupListener();
    }
  },

  _setupListener() {
    //
    // Create a low-resolution analyser that will report about the
    // volume of our stream.
    //
    const audioContext = new window.AudioContext();
    this.analyser = audioContext.createAnalyser();
    this.analyser.minDecibels = -80;
    this.analyser.maxDecibels = -20;
    this.analyser.fftSize = 32;
    const source = audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.ratio = 0;
  },

  tick: function (time, delta) {
    if (!this.emitSoundEvents) {
      return;
    }

    //
    // Get the current volume as a number between 0 and 1.
    //
    let maxByteFrequencyData = 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    for (const d of this.dataArray) {
      if (d > maxByteFrequencyData) {
        maxByteFrequencyData = d;
        if (maxByteFrequencyData === 255) {
          break;
        }
      }
    }
    const ratio = maxByteFrequencyData / 255;
    //
    // If the volume changed significantly, emit an event.
    //
    if (ratio < this.ratio - 0.1 ||
        ratio > this.ratio + 0.1) {
      this.ratio = ratio;
      this.el.dispatchEvent(SOUND_EVENT);
    }
  }
});

/**
 * A component providing a bit of facility to VR halfbody avatars from
 * https://readyplayer.me/
 *
 * Features:
 * - generate separate entities from each node in the model tree, so
 *   that e.g. hands can be moved or rotated separately from the rest
 *   of the body. This works by specifying sub-entities named after
 *   the nodes we want to expand.
 * - idle eyes animation triggers after a configurable number of
 *   seconds of inactivity.
 * - model can be set to pay attention to a set of entities defines by
 *   a querySelector. When one such entity is in the model line of
 *   sight, the eyes will look in its direction.
 * - model will listen to events emitted by a mediastream-sound
 *   component active on the same entity and open/close its mouth
 *   according to the detected sound level.
 *
 * Model is automatically rotated 180° (default would face the user)
 * and offset 65cm, so that head is at 0 level with respect to its
 * containing entity.
 *
 * Note that default ReadyPlayerMe models include hands. In the past,
 * hands and other body parts were provided as separate meshes, so one
 * could hide them programmatically. Now, only one mesh is provided
 * that includes every body part. A model without hands can be
 * obtained by providing the proper parameters to the web API.
 *
 * Inspired by the "inflation" approach used in Mozilla Hubs
 *
 * See
 * https://docs.readyplayer.me/ready-player-me/avatars/avatar-creator/vr-avatar
 * for a description of the avatar's structure and for web API
 * documentation.
 *
 */

//
// The identity quaternion is used to calculate the rotation angle of
// our eyes when we are looking at objects.
//
const READYPLAYERME_IDENTITY_QUATERNION = new THREE.Quaternion();
READYPLAYERME_IDENTITY_QUATERNION.identity();

READYPLAYERME_WORLD_POSITION_THIS = new THREE.Vector3();
READYPLAYERME_WORLD_POSITION_THAT = new THREE.Vector3();

window.AFRAME.registerComponent('readyplayerme-avatar', {
  schema: {
    model: {type: 'model'},
    idleTimeout: {type: 'int', default: 10},
    lookAt: {type: 'string'}
  },

  init: function () {
    this.model = null;
    this.animations = null;
    this.isIdle = false;
    this.eyes = [];

    this.el.addEventListener('mediastream-loud', e => {
      this._setMorphTargetValue('mouthOpen', e.target.components['mediastream-sound'].ratio);
    });
  },

  _inflate: function (node) {
    //
    // Models used to provide separate meshes for different body
    // parts. This is not the case anymore, but as we currently assume
    // models without hands, keep supporting old models by always
    // making them invisible.
    //
    if (node.type === 'SkinnedMesh' &&
        node.name === 'Wolf3D_Hands') {
      node.visible = false;
    }

    if (node.name === 'RightEye' || node.name === 'LeftEye') {
      this.eyes.push(node);
    }

    //
    // Inflate subtrees first so that we can determine whether or not
    // this node needs to be inflated.
    //
    const childrenEntities = [];
    //
    // setObject3D mutates the node's parent, so we have to use a copy
    // of the children as they are now (children is a live
    // collection).
    //
    for (const child of node.children.slice(0)) {
      const childEntity = this._inflate(child);
      if (childEntity) {
        childrenEntities.push(childEntity);
      }
    }

    //
    // Nodes will become an entity if any of this is true:
    // - it is the 'Scene' node (root of the model)
    // - it is explicitly set to be inflated by the user (we have a
    //   sub-entity with the corresponding name)
    // - it is an ancestor of a node that has been inflated
    //
    const inflatedNode = this.el.querySelector(`[name='${node.name}']`);
    if (node.name !== 'Scene' && !inflatedNode && childrenEntities.length === 0) {
      return;
    }

    //
    // If the user supplied a custom entity for this node we will use
    // it, otherwise we default to an a-entity.
    //
    const el = inflatedNode ? inflatedNode : document.createElement('a-entity');

    el.setAttribute('name', node.name);

    if (node.name === 'Scene') {
      //
      // Compensate that the model is turned the other way around and
      // offset from the ground around 65cm, by countering this on the
      // scene element.
      //
      el.setAttribute('position', '0 -0.65 0');
      el.setAttribute('rotation', '0 180 0');
    }

    for (const childEntity of childrenEntities) {
      el.appendChild(childEntity);
    }

    //
    // AFRAME rotation component expects rotations in YXZ, convert it
    //
    if (node.rotation.order !== 'YXZ') {
      node.rotation.setFromQuaternion(node.quaternion, 'YXZ');
    }

    //
    // Copy over the object's transform to the THREE.Group and reset
    // the actual transform of the Object3D all updates to the object
    // should be done through the THREE.Group wrapper
    //
    el.object3D.position.copy(node.position);
    el.object3D.rotation.copy(node.rotation);
    el.object3D.matrixNeedsUpdate = true;

    node.matrixAutoUpdate = false;
    node.matrix.identity();
    node.matrix.decompose(node.position, node.rotation, node.scale);

    el.setObject3D(node.type.toLowerCase(), node);

    //
    // Set the name of the `THREE.Group` to match the name of the
    // node, so that templates can be attached to the correct AFrame
    // entity.
    //
    el.object3D.name = node.name;

    //
    // Set the uuid of the `THREE.Group` to match the uuid of the
    // node, so that `THREE.PropertyBinding` will find (and later
    // animate) the group. See `PropertyBinding.findNode`:
    // https://github.com/mrdoob/three.js/blob/dev/src/animation/PropertyBinding.js#L211
    //
    el.object3D.uuid = node.uuid;
    node.uuid = THREE.MathUtils.generateUUID();

    return el;
  },

  _compareDistance: function (a, b) {
    this.el.object3D.getWorldPosition(READYPLAYERME_WORLD_POSITION_THIS);
    const aDistance = a.getWorldPosition(READYPLAYERME_WORLD_POSITION_THAT)
          .distanceTo(READYPLAYERME_WORLD_POSITION_THIS);
    const bDistance = b.getWorldPosition(READYPLAYERME_WORLD_POSITION_THAT)
          .distanceTo(READYPLAYERME_WORLD_POSITION_THIS);
    return aDistance - bDistance;
  },

  _lookAtEntities: (function () {
    //
    // Sort the lookable entities by distance from this entity, so
    // that the closest entities have the precedence when deciding
    // what to look at.
    //
    // Throttle this operation to once per second.
    //
    const lookArray = [];
    let fixation = 0;
    return function (delta) {
      if (fixation <= 0) {
        lookArray.length = 0;
        for (const e of document.querySelectorAll(this.lookAt)) {
          if (e.object3D && e.object3D.visible) {
            lookArray.push(e.object3D);
          }
        }
        lookArray.sort(this._compareDistance.bind(this));

        fixation = 1000;
      }
      fixation -= delta;
      return lookArray;
    };
  })(),

  _look: function (delta) {
    if (this.isIdle || this.eyes.length == 0 || !this.lookAt) {
      return;
    }

    //
    // Loop through the entities that we want to look at. The first
    // one in our line of sight will be the one we actually look at.
    //
    for (const lookAt of this._lookAtEntities(delta)) {
      let inLineOfSight = true;
      for (const eye of this.eyes) {
        //
        // Look at the object, but constrain the eyes rotation to 0.3
        // radians. When the angle is bigger, the entity is not in our
        // line of sight.
        //
        eye.lookAt(lookAt.getWorldPosition(READYPLAYERME_WORLD_POSITION_THAT));
        const eyeRotation = eye.quaternion.angleTo(READYPLAYERME_IDENTITY_QUATERNION);
        inLineOfSight&&= window.Math.abs(eyeRotation) <= 0.3;
      }
      for (const eye of this.eyes) {
        if (!inLineOfSight) {
          //
          // If one or both eyes would rotate too much, they will both
          // look straight ahead instead.
          //
          eye.quaternion.copy(READYPLAYERME_IDENTITY_QUATERNION);
        }
        //
        // Compensate a PI/2 offset in the X rotation.
        //
        eye.rotateX(Math.PI / 2);
      }
      if (inLineOfSight) {
        break;
      }
    }
  },

  _weAreMoving: (function () {
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    return function () {
      if (!position.equals(this.el.object3D.position) ||
          !rotation.equals(this.el.object3D.quaternion)) {
        position.copy(this.el.object3D.position);
        rotation.copy(this.el.object3D.quaternion);
        return true;
      } else {
        return false;
      }
    };
  })(),

  tick: function (time, delta) {
    if (!this.mixer) {
      // Model is not initialized yet.
      return;
    }

    //
    // When we move, reset the idle timeout.
    //
    if (this._weAreMoving()) {
      this.idle = this.idleTimeout;
    }

    this.idle -= delta;
    if (this.idle <= 0 && !this.isIdle) {
      this.isIdle = true;
      this._playAnimation('idle_eyes_2');
    } else if (this.idle > 0 && this.isIdle) {
      this.isIdle = false;
      this._stopAnimation('idle_eyes_2');
    }

    if (this.isIdle) {
      this.mixer.update(delta / 1000);
    } else {
      this._look(delta);
    }
  },

  _getClipAction: function (name) {
    //
    // Returns a handle to the AnimationAction bound to supplied
    // animation name.
    //
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    return this.mixer.clipAction(clip);
  },

  _setMorphTargetValue: function (name, value) {
    if (this.morphTargets) {
      const morphTargets = this.morphTargets[name][0];
      const morphTargetPos = this.morphTargets[name][1];
      morphTargets[morphTargetPos] = value;
    }
  },

  _playAnimation: function (name) {
    //
    // Play a specific animation
    //
    this._getClipAction(name).play();
  },

  _stopAnimation: function (name) {
    //
    // Stop a specific animation
    //
    this._getClipAction(name).stop();
  },

  update: function () {
    const self = this;
    const el = this.el;

    if (this.data.lookAt) {
      this.lookAt = this.data.lookAt;
    }

    if (this.data.idleTimeout) {
      this.idleTimeout = this.data.idleTimeout * 1000;
      this.idle = this.idleTimeout;
    }

    const src = this.data.model;
    if (!src) { return; }

    this.remove();

    this.el.addEventListener('model-loaded', function (e) {
      self.mesh = e.detail.model;

      //
      // Create an AnimationMixer, and get the list of AnimationClip
      // instances
      //
      self.mixer = new THREE.AnimationMixer(self.mesh);
      self.animations = self.mesh.animations;

      //
      // Traverse the mesh looking for morph targets and target names.
      //
      self.morphTargets = {};
      self.mesh.traverse((o) => {
        if ( o.morphTargetInfluences && o.userData.targetNames ) {
          //
          // When morph targets are defines for this node, collect
          // them, together with a quick mapping from name to
          // position.
          //
          for (let i = 0; i < o.userData.targetNames.length; i++) {
            const targetName = o.userData.targetNames[i];
            //
            // Note, we assume that only one node defines a
            // morphTarget for any given name on a model.
            //
            self.morphTargets[targetName] = [o.morphTargetInfluences, i];
          }
        }
      });

      const inflated = self._inflate(self.mesh);
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
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin('anonymous');
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
    const lastGesture = oldData.gesture;
    const gesture = this.data.gesture;

    const previousHand = oldData.hand;
    const hand = this.data.hand;

    var el = this.el;
    var handModelStyle = this.data.handModelStyle;
    var handColor = this.data.color;
    var self = this;

    // Set model.
    if (hand !== previousHand) {
      var handmodelUrl = MODEL_URLS[handModelStyle + hand.charAt(0).toUpperCase() + hand.slice(1)];
      this.loader.load(handmodelUrl, function (gltf) {
        var mesh = gltf.scene.children[0];
        var handModelOrientationZ = hand === 'left' ? Math.PI / 2 : -Math.PI / 2;
        //
        // hand-controls enables this extra rotation only in VR and
        // not on desktop, but these are remote hands and we should
        // always assume them to be controlled by a VR device.
        //
        var handModelOrientationX = -Math.PI / 2;
        mesh.mixer = new THREE.AnimationMixer(mesh);
        self.clips = gltf.animations;
        el.setObject3D('mesh', mesh);
        mesh.traverse(function (object) {
          if (!object.isMesh) { return; }
          object.material.color = new THREE.Color(handColor);
        });
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(handModelOrientationX, 0, handModelOrientationZ);
        el.emit('model-loaded', {format: 'gltf', model: mesh});
      });
    }

    //
    // Animate gesture.
    //
    this.animateGesture(gesture, lastGesture);
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

    // Grab clip action.
    clip = this.getClip(gesture);
    toAction = mesh.mixer.clipAction(clip);

    // Reverse from gesture to no gesture.
    if (reverse) {
      toAction.paused = false;
      toAction.timeScale = -1;
      return;
    }

    toAction.clampWhenFinished = true;
    toAction.loop = THREE.LoopOnce;
    toAction.repetitions = 0;
    toAction.timeScale = 1;
    toAction.time = 0;
    toAction.weight = 1;

    // No gesture to gesture.
    if (!lastGesture) {
      // Play animation.
      mesh.mixer.stopAllAction();
      toAction.play();
      return;
    }

    // Animate or crossfade from gesture to gesture.
    clip = this.getClip(lastGesture);
    toAction.reset();
    toAction.play();
    fromAction = mesh.mixer.clipAction(clip);
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

    this._connect();
    this._attachTracksOnNewEntities();
    this._notifyConnectionStatus('warning', 'Waiting for connection...');
  },

  update: function (oldData) {
    const stream = this._getLocalStream();
    if (stream) {
      for (const track of stream.getAudioTracks()) {
        track.enabled = !this.data.muted;
        console.log(`Local stream: enabled=${track.enabled}`);
      }
    }
  },

  _getLocalStream: function () {
    if (this.pluginHandle &&
        this.pluginHandle.webrtcStuff) {
      return this.pluginHandle.webrtcStuff.myStream;
    } else {
      return null;
    }
  },

  _defaultURI: function () {
    if (window.location.protocol === 'http:') {
      return `http://${window.location.hostname}:8088/janus`;
    } else {
      return `https://${window.location.hostname}:8089/janus`;
    }
  },

  _feedToHTMLId: function (feed) {
    return this.stringIds ? feed.id : feed.display;
  },

  tick: function (time, delta) {
    this.time = time;
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
        v.id = `${track.id}-${this.time}`;
        element.appendChild(v);
      }
      v.srcObject = stream;
      element.setAttribute('material', 'src', `#${v.id}`);
    } else if (track.kind === 'audio') {
      // Track is audio: we attach it to the element.
      // TODO: right now we assume audio to be positional.
      element.setAttribute('mediastream-sound', '');
      element.components['mediastream-sound'].setMediaStream(stream);
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
    }
  },

  _unsubscribeFrom: function (id) {
    // Unsubscribe from this publisher
    const feed = this.feedStreams[id];
    if (!feed) {
      return;
    }

    console.debug(`Feed ${id} (${feed.display}) has left the room, detaching`);

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
        console.debug('Got publisher SDP!');
        console.debug(jsep);
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
        self._notifyConnectionStatus(
          'warning',
          'We do not stream our own microphone. Other participants won\'t be able to hear us.'
        );
        console.error('WebRTC error:', error);
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
            console.warn(`Publisher is using ${stream.codec.toUpperCase}, but Safari does not support it: disabling video stream #${stream.mindex}`);
            continue;
          }
          if (stream.disabled) {
            console.log('Disabled stream:', stream);
            // TODO Skipping for now, we should unsubscribe
            continue;
          }
          if (this.subscriptions[stream.id] && this.subscriptions[stream.id][stream.mid]) {
            console.log('Already subscribed to stream, skipping:', stream);
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
        console.log(`Plugin attached! (${self.remoteFeed.getPlugin()}, id=${self.remoteFeed.getId()})`);
        console.log('  -- This is a multistream subscriber');
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
              console.warn(`Publisher is using ${stream.codec.toUpperCase}, but Safari does not support it: disabling video stream #${stream.mindex}`);
              continue;
            }
            if (stream.disabled) {
              console.log('Disabled stream:', stream);
              // TODO Skipping for now, we should unsubscribe
              continue;
            }
            console.log(`Subscribed to ${stream.id}/${stream.mid}?`, self.subscriptions);
            if (self.subscriptions[stream.id] && self.subscriptions[stream.id][stream.mid]) {
              console.log('Already subscribed to stream, skipping:', stream);
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
        console.error('  -- Error attaching plugin...', error);
      },
      iceState: function (state) {
        console.log('ICE state (remote feed) changed to ', state);
      },
      webrtcState: function (on) {
        console.log(`Janus says this WebRTC PeerConnection (remote feed) is ${on ? 'up' : 'down'} now`);
      },
      slowLink: function (uplink, lost, mid) {
        console.warn(`Janus reports problems ${uplink ? 'sending' : 'receiving'} packets on mid ${mid} (${lost} lost packets)`);
      },
      onmessage: function (msg, jsep) {
        console.debug(' ::: Got a message (subscriber) :::', msg);
        const event = msg['videoroom'];
        console.debug('Event:', event);
        if (msg['error']) {
          console.error(msg['error']);
        } else if (event) {
          if (event === 'attached') {
            // Now we have a working subscription, next requests will update this one
            self.creatingSubscription = false;
            console.log('Successfully attached to feed in room', msg.room);
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
                console.log('Switched simulcast substream! (lower quality)', null, {timeOut: 2000});
              } else if (substream === 1) {
                console.log('Switched simulcast substream! (normal quality)', null, {timeOut: 2000});
              } else if (substream === 2) {
                console.log('Switched simulcast substream! (higher quality)', null, {timeOut: 2000});
              }
              // Check the temporal layer
              if (temporal === 0) {
                console.log('Capped simulcast temporal layer! (lowest FPS)', null, {timeOut: 2000});
              } else if (temporal === 1) {
                console.log('Capped simulcast temporal layer! (medium FPS)', null, {timeOut: 2000});
              } else if (temporal === 2) {
                console.log('Capped simulcast temporal layer! (highest FPS)', null, {timeOut: 2000});
              }
            }
          } else {
            console.log('What has just happened?');
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
          console.debug('Handling SDP as well...', jsep);
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
              console.debug('Got SDP!');
              console.debug(jsep);
              const body = { request: 'start', room: self.room };
              self.remoteFeed.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              console.error('WebRTC error:', error);
            }
          });
        }
      },
      onlocaltrack: function (track, on) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotetrack: function (track, mid, on) {
        console.debug(`Remote track (mid=${mid}) ${on ? 'added' : 'removed'}:`, track);
        // Which publisher are we getting on this mid?
        const sub = self.subStreams[mid];
        const feed = self.feedStreams[sub.feed_id];
        console.debug(` >> This track is coming from feed ${sub.feed_id}:`, feed);
        if (on) {
          if (sub.feed_id == self.id) {
            console.log('This is us, skipping...');
          }

          console.log('We have a track!', sub, track);

          self._addTrack(feed, track);
        }

      },
      oncleanup: function () {
        console.log(' ::: Got a cleanup notification (remote feed) :::');
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

  _notifyConnectionStatus: function (level, status, data = {}) {
    data.level = level;
    data.status = status;
    this.el.dispatchEvent(new CustomEvent(
      'connectionstatuschange',
      {detail: data}
    ));
    if (level === 'success') {
      console.log(status);
    } else if (level === 'warning') {
      console.warn(status);
    } else {
      console.error(status);
    }
  },

  _reconnectOnError: function (error) {
    //
    // Error handling
    //
    // On error, we destroy this entire Janus connection and
    // create a fresh one from scratch after waiting 2
    // seconds.
    //
    this._notifyConnectionStatus('danger', error);
    console.log('Destroying current connection...');
    this.janus.destroy({cleanupHandles: true});
    console.log('Attempting reconnection in 2s...');
    setTimeout(this._connect.bind(this), 2000);
  },

  _connect: function () {
    this._notifyConnectionStatus('warning', 'Connecting...');

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

    const self = this;

    window.Janus.init({
      debug: this.debug,
      callback: function () {
        // Make sure the browser supports WebRTC
        if (!window.Janus.isWebrtcSupported()) {
          self._notifyConnectionStatus('danger', 'No WebRTC support...');
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
                    console.log(`Plugin attached! (${self.pluginHandle.getPlugin()}, id=${self.pluginHandle.getId()})`);
                    console.log('  -- This is a publisher/manager');
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
                    self._notifyConnectionStatus('danger', error);
                    console.error('  -- Error attaching plugin...', error);
                  },
                  consentDialog: function (on) {
                    console.debug(`Consent dialog should be ${on ? 'on' : 'off'} now`);
                  },
                  iceState: function (state) {
                    console.log(`ICE state changed to ${state}`);
                  },
                  mediaState: function (medium, on, mid) {
                    console.log(`Janus ${on ? 'started' : 'stopped'} receiving our ${medium} (mid=${mid})`);
                  },
                  webrtcState: function (on) {
                    console.log(`Janus says our WebRTC PeerConnection is ${on ? 'up' : 'down'} now`);
                  },
                  slowLink: function (uplink, lost, mid) {
                    console.warn(`Janus reports problems ${uplink ? 'sending' : 'receiving'} packets on mid ${mid} (${lost} lost packets)`);
                  },
                  onmessage: function (msg, jsep) {
                    console.debug(' ::: Got a message (publisher) :::', msg);
                    const event = msg['videoroom'];
                    console.debug('Event:', event);
                    if (event != undefined && event != null) {
                      if (event === 'joined') {
                        // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                        self.id = msg['id'];
                        self.privateId = msg['private_id'];
                        console.log(`Successfully joined room ${msg.room} with ID ${self.id}`);
                        self._publishOwnFeed();
                        // Any new feed to attach to?
                        if (msg['publishers']) {
                          const list = msg['publishers'];
                          console.debug('Got a list of available publishers/feeds:', list);
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
                            console.debug(`  >> [${id}] ${display}:`, streams);
                            sources.push(streams);
                          }
                          if (sources.length > 0) {
                            self._subscribeTo(sources);
                          }
                        }
                      } else if (event === 'destroyed') {
                        //
                        // The room may be destroyed when the web
                        // server is restarted and a new volatile room
                        // is generated.
                        //
                        // Reconnecting may not solve the issue if the
                        // pin was also changed, but on reconnection
                        // the appropriate error will pop up informing
                        // the user they should probably reload the
                        // experience.
                        //
                        self._reconnectOnError('Videoroom has been destroyed.');
                      } else if (event === 'event') {
                        if (msg['error']) {
                          //
                          // Errors in here may be such as "wrong
                          // room" or "wrong pin", which may happen if
                          // the server was restarted and a new
                          // volatile room was generated. Reloading
                          // the page may help here, but do not want
                          // to do it mid-experience, so we just
                          // display the error we received and suggest the
                          // user they may reload.
                          //
                          const errMsg = msg['error_code'] === 426 ?
                                'webRTC room not found.' : msg['error'];
                          self._notifyConnectionStatus(
                            'danger',
                            `The webRCT backend reported an error: ${errMsg}. Exiting and re-entering the VR experience may solve the problem.`
                          );
                        } else if (msg['streams']) {
                          //
                          // Info on our streams or a new feed to
                          // attach to.
                          //
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
                          console.debug('Got a list of available publishers/feeds:', list);
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
                            console.debug(`  >> [${id}] ${display}:`, streams);
                            sources.push(streams);
                          }
                          if (sources.length > 0) {
                            self._subscribeTo(sources);
                          }
                        } else if (msg['leaving']) {
                          // One of the publishers has gone away?
                          const leaving = msg['leaving'];
                          console.log('Publisher left:', leaving);
                          self._unsubscribeFrom(leaving);
                        } else if (msg['unpublished']) {
                          // One of the publishers has unpublished?
                          const unpublished = msg['unpublished'];
                          console.log('Publisher left:', unpublished);
                          if (unpublished === 'ok') {
                            //
                            // This is our feed. We currently do not
                            // support unpublishing our audio feed
                            // mid-experience, so we treat it as an
                            // error.
                            //
                            self._reconnectOnError('Local feed was lost');
                            return;
                          }
                          self._unsubscribeFrom(unpublished);
                        }
                      }
                    }
                    if (jsep) {
                      console.debug('Handling SDP as well...', jsep);
                      self.pluginHandle.handleRemoteJsep({ jsep: jsep });
                      //
                      // We could tell here if your codec was rejected
                      //
                    }
                  },
                  onlocaltrack: function (track, on) {
                    console.debug(' ::: Got a local track event :::');
                    console.debug(`Local track ${on ? 'added' : 'removed'}:`, track);

                    if (on) {
                      //
                      // We use the presence of our local feed as proof
                      // that the connection works.
                      //
                      self._notifyConnectionStatus('success', 'Connected.', {
                        stream: self._getLocalStream()
                      });
                    } else {
                      //
                      // Losing the local feed could happen if we
                      // revoke access to the microphone
                      // mid-experience. It is not expected to happen
                      // otherwise. We reconnect to try and
                      // recover. If the permission was denied on
                      // purpose, user will be informed when trying to
                      // publish the local feed again.
                      //
                      self._reconnectOnError('Local feed was lost');
                    }
                  },
                  onremotetrack: function (track, mid, on) {
                    // The publisher stream is sendonly, we don't expect anything here
                  },
                  oncleanup: function () {
                    console.log(' ::: Got a cleanup notification: we are unpublished now :::');
                    delete self.feedStreams[self.id];
                  }
                });
            },
            error: self._reconnectOnError.bind(self),
            destroyed: function () {
              console.warn('Janus object has been destroyed');
              // window.location.reload();
            }
          });
      }
    });
  },

  _attachTracksOnNewEntities: function () {
    const self = this;
    //
    // We might have gotten the tracks already for element that are
    // still not part of the scene. We detect whenever a new element
    // is attached to the scene, check if this has tracks belonging to
    // it and attach them.
    //
    this.el.sceneEl.addEventListener('child-attached', function (e) {
      const element = e.detail.el;
      const elementTracks = self.remoteTracks[element.id];
      if (elementTracks) {
        for (const track of elementTracks) {
          self._attachTrack(element, track);
        }
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

    this._privateProperties = ['id', 'type', 'template'];

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

  deleteEntity: function (id) {
    //
    // Delete an object for us and for all peers.
    //
    // Returns success as true/false.
    //
    const el = document.getElementById(id);

    //
    // Check that only existing networked entities are deleted. Also
    // prevent deleting ourselves.
    //
    if (!el ||
        !el.components ||
        !el.components['oacs-networked-entity'] ||
        el.tagName === 'A-CAMERA' ||
        el.components['hand-controls']) {
      return false;
    }

    el.parentElement.removeChild(el);

    const msg = this.msgObject();
    msg.id = id;
    msg.type = 'delete';
    this.send(msg);

    return true;
  },

  sendEntityUpdate: function (entity, updateProperties) {
    //
    // Send an update message for an entity. Entity must be networked.
    //
    // The purpose of this method is to send custom updates that do
    // not come from the change listener component, e.g. to react to
    // events on the scene. By default, will behave as handler for the
    // entityChanged event.
    //
    const component = entity.components['oacs-networked-entity'];
    if (component) {
      if (typeof updateProperties === 'undefined') {
        const changeComponent = entity.components['oacs-change-listener'];
        if (changeComponent) {
          updateProperties = changeComponent.changedProperties;
        }
      }
      if (typeof updateProperties !== 'undefined') {
        const msg = this.msgObject();
        msg.id = component.networkId;
        msg.type = 'update';
        Object.assign(msg, updateProperties);
        this.send(msg);
      }
    }
  },

  sendToOwner: function (id, message) {
    //
    // Send a message to the owner of a specified entity.
    //
    // This is used to send information that is relevant only to a
    // specific user and that should not be broadcasted.
    //
    const msg = this.msgObject();
    msg.id = id;
    msg.type = 'send-to-owner';
    msg.message = message;
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
    window.addEventListener('entityChanged', (evt) => {
      this.sendEntityUpdate(evt.target);
    });

    if (this.isHeadset) {
      //
      // On headsets, avatar and hands are not attached to the scene
      // right away, but deferred to when we are in immersive mode.
      //
      // The main reasons is that window.onbeforeunload is not
      // triggered easily on e.g. Oculus, because one does seldom
      // close the app explicitly. enter-vr and exit-vr are much more
      // realiable events in this case.
      //

      //
      // On headsets, clear all of my networked entities when exiting
      // immersive mode.
      //
      window.addEventListener('exit-vr', this._clear);

      //
      // On headsets, our avatar will spawn only once we enter
      // immersive mode.
      //
      window.addEventListener('enter-vr', function (e) {
        document.querySelector('a-camera[oacs-networked-entity]')?.
          components['oacs-networked-entity'].attach();
      });
    }

    //
    // Hands are attached to the scene only upon controller
    // connection.
    //
    window.addEventListener('controllerconnected', (e) => {
      e.target?.components['oacs-networked-entity'].attach();
    });

    //
    // When the page is closed, clear our stuff.
    //
    window.addEventListener('beforeunload', this._clear);
  },

  _defaultWsURI: function () {
    const proto = window.location.protocol;
    const host = window.location.host;
    return `${proto === 'https:' ? 'wss:' : 'ws:'}//${host}/aframe-vr/connect`;
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
      const self = this;
      el.addEventListener('loaded', function () {
        self._update(el, data);
      });
      this.sceneEl.appendChild(el);
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
    for (const property of this._privateProperties) {
      delete data[property];
    }
    if (!el.components['oacs-updated-entity']) {
      el.setAttribute('oacs-updated-entity', '');
    }
    el.components['oacs-updated-entity'].doUpdate(data);
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
      case 'send-to-owner':
        this.sceneEl.emit('owner-message', m.message);
        break;
      default:
        console.error('Invalid message type:', m.type);
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

  _notifyConnectionStatus: function (level, status) {
    this.el.dispatchEvent(new CustomEvent(
      'connectionstatuschange',
      {detail: {
        level: level,
        status: status
      }}
    ));
    if (level === 'success') {
      console.log(status);
    } else if (level === 'warning') {
      console.warn(status);
    } else {
      console.error(status);
    }
  },

  _reconnectOnError: function (error) {
    this._notifyConnectionStatus('danger', error);
    console.log('Attempting reconnection in 2s...');
    setTimeout(this._connect.bind(this), 2000);
  },

  _connect: function () {
    const self = this;

    this._notifyConnectionStatus('warning', 'Connecting...');

    if (this.websocket) {
      //
      // If this is a reconnection, make sure the old websocket is
      // closed first.
      //
      this.websocket.close();
    } else {
      //
      // At first connection, start the websocket keepalive.
      //
      setInterval(function () {
        if (self.websocket.readyState === window.WebSocket.OPEN) {
          self.websocket.send('ping');
        }
      }, 30000);
    }

    this.websocket = new window.WebSocket(this.wsURI);

    this.websocket.onopen = function (e) {
      //
      // Send (or re-send) all networked entities that have already
      // been attached to the scene locally, then issue a forced
      // update on all of them.
      //
      // This handles both the cases of connection and reconnection.
      //
      for (const entity of
           document.querySelectorAll('[oacs-networked-entity]')) {
        const networkedEntity = entity.components['oacs-networked-entity'];
        if (networkedEntity.isAttached) {
          networkedEntity.attach();
          entity.components['oacs-change-listener'].update();
        }
      }
      self._notifyConnectionStatus('success', 'Connected.');
    };
    this.websocket.addEventListener('close', function (e) {
      self._reconnectOnError('Disconnected.');
    });
    this.websocket.addEventListener('message', function (e) {
      self._onMessage(e);
    });
    this.websocket.addEventListener('error', function (e) {
      self._notifyConnectionStatus('danger', e);
    });
  }
});

window.AFRAME.registerComponent('oacs-networked-entity', {
  schema: {
    networkId: {type: 'string'},
    template: {type: 'selector'},
    color: {type: 'color', default: ''},
    randomColor: {type: 'boolean', default: false},
    permanent: {type: 'boolean', default: false},
    properties: { type: 'array', default: ['position', 'rotation'] },
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
      this.template = this.data.template.outerHTML;
    }

    this.networkId = this.data.networkId ? this.data.networkId : this.el.getAttribute('id');
    this.name = this.data.name;
    this.permanent = this.data.permanent;

    if (this.data.randomColor) {
      this.color = `#${Math.random().toString(16).substr(2, 6)}`;
    } else {
      this.color = this.data.color;
    }

    this.properties = this.data.properties;

    this.isAttached = false;

    //
    // Hands and avatars are special and we may not add them to the
    // scene right away
    //
    // - hands: only when controllers are connected
    // - avatar: immediately if we are on desktop and only if we enter
    //           immersive mode otherwise
    //
    if (!this.el.hasAttribute('hand-controls') &&
        (!this.networkedScene.isHeadset ||
         !this.el.tagName !== 'A-CAMERA')) {
      this.attach();
    }
  },

  pause: function () {
    //
    // Shuts down event generation on changes
    //
    if (this.el.components['oacs-change-listener']) {
      this.el.components['oacs-change-listener'].pause();
    }
  },

  play: function () {
    //
    // We wait until the entity has been created before we listen to
    // events.
    //
    if (this.isAttached) {
      this._startListening();
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

  _startListening: function () {
    //
    // Start event generation on changes
    //
    if (this.el.components['oacs-change-listener']) {
      this.el.components['oacs-change-listener'].play();
    } else {
      this.el.setAttribute('oacs-change-listener', 'properties', this.properties);
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
    this._startListening();
  }
});

/**
 * This component maps the property updates received from the network
 * to the actual operation that will be applied on the entity. For
 * instance, certain properties are applied on sub-entities and not on
 * the entity itself. Other properties are not applied as-is, but need
 * a translation to be applied first. This is the place where this
 * translations happen and are cached.
 */
window.AFRAME.registerComponent('oacs-updated-entity', {
  init: function () {
    this._initPropertyElements();
    this._propertySetters = {};
  },

  doUpdate: function (data) {
    for (const property in data) {
      this._setProperty(property, data[property]);
    }
  },

  _requirePropertySetter: function (property) {
    if (!this._propertySetters[property]) {
      let el;
      if (this.propertyElements[property]) {
        el = this.propertyElements[property];
      } else {
        el = this.el;
      }
      this._propertySetters[property] =
        this._getPropertySetter(el, property);
    }
    return this._propertySetters[property];
  },

  _setProperty: function (property, value) {
    //
    // Requires the right property setter for this property and uses
    // it to set the value on this entity.
    //
    const setter = this._requirePropertySetter(property);
    setter(value);
  },

  _getPropertySetter: function (el, property) {
    //
    // When present, the value of the dataset property tells which is
    // the real attribute we should change.
    //
    if (typeof el.dataset[property] !== 'undefined' &&
        el.dataset[property] !== '') {
      property = el.dataset[property];
    }

    //
    // Position and rotation are applied directly on the object3D.
    //
    if ((property === 'rotation' ||
         property === 'position' ||
         property === 'scale') &&
        el.object3D) {
      return function (value) {
        el.object3D[property].set(
          value.x, value.y, value.z
        );
      };
    }

    //
    // The gesture is applied on the remote-hand-controls component.
    //
    if (property === 'gesture') {
      return function (value) {
        el.setAttribute('remote-hand-controls', 'gesture', value);
      };
    }

    //
    // In all other cases, we just set the attribute.
    //
    return function (value) {
      el.setAttribute(property, value);
    };
  },

  _initPropertyElements: function () {
    this.propertyElements = {};

    //
    // A property is by default set by its attribute name on the
    // element. Optionally, one can specify a data-#property name#
    // attribute on a child element in the template to say that this
    // is the element where the property should be updated.
    //
    for (const descendant of this.el.querySelectorAll('*')) {
      for (const property in descendant.dataset) {
        this.propertyElements[property] = descendant;
      }
    }
    //
    // All remaining properties are set on the entity directly.
    //
  },

});

/**
 * Clamp the size of between a min and a max values. Size is modeled
 * as the max between length, height and depth of the bounding box
 * enclosing the entity.
 */
const _getBoundinBox = (function () {
  const box = new THREE.Box3();
  return function (object) {
    return box.setFromObject(object, false);
  };
})();
const _getBoundinBoxSize = (function () {
  const vec = new THREE.Vector3();
  return function (object) {
    return _getBoundinBox(object).getSize(vec);
  };
})();
function _getObjectSize(object) {
  const vec = _getBoundinBoxSize(object);
  return Math.max(vec.x, vec.y, vec.z);
}
window.AFRAME.registerComponent('clamp-size', {
  schema: {
    minSize: {type: 'number', default: 0.2},
    maxSize: {type: 'number', default: 1.6},
    always: {type: 'boolean', default: false}
  },

  init: function () {
    this.minSize = this.data.minSize;
    this.maxSize = this.data.maxSize;

    //
    // We clamp the size at init.
    //
    this._clampSize();

    if (this.data.always) {
      //
      // When requested, we also clamp the size every second to
      // enforce that size stays in range.
      //
      this.tick = AFRAME.utils.throttleTick(this._clampSize, 1000, this);
    }
  },

  _clampSize: function () {
    const size = _getObjectSize(this.el.object3D);
    if (size === 0) {
      //
      // This is probably a gltf model, we need to wait for it to be
      // loaded.
      //
      this.el.addEventListener('model-loaded', this._clampSize.bind(this));
      return;
    }

    let ratio;
    if (size > this.maxSize) {
      ratio = this.maxSize / size;
    } else if (size < this.minSize) {
      ratio = this.minSize / size;
    }

    if (typeof ratio !== 'undefined') {
      this.el.object3D.scale.multiplyScalar(ratio);
    }
  }
});

/**
 * Center all direct children of the entity to the center of the
 * entity's bounding box. Used to fix gltf models in the wild that may
 * come with an origin different from the center.
 */
const _centerModel = (function () {
  const b = new THREE.Box3();
  return function (object) {
    //
    // Ensure world matrix is up to date.
    //
    object.updateMatrixWorld();

    b.setFromObject(object);
    for (child of object.children) {
      object.worldToLocal(b.getCenter(child.position)).
	divide(object.scale).
	negate();
    }
  };
})();
window.AFRAME.registerComponent('center', {
  init: function () {
    this.el.addEventListener('model-loaded', e => {
      _centerModel(this.el.object3D);
    });
  }
});

/**
 * Creates an outline effect around the entity. Useful e.g. to provide
 * visual feedback on interaction.
 *
 * Port of example at
 * https://stemkoski.github.io/Three.js/Outline.html
 */
window.AFRAME.registerComponent('outline', {
  schema: {
    enabled: {
      type: 'boolean',
      default: false
    },
    color: {
      type: 'color',
      default: '#ffff00'
    }
  },
  init: function () {
    this.mesh = this.el.getObject3D('mesh');
    if (!this.mesh) {
      //
      // Wait for the model to be loaded, then update again.
      //
      this.el.addEventListener('model-loaded', this.update.bind(this));
    }

    this.material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.BackSide
    });
  },
  update: function () {
    if (!this.mesh) {
      //
      // Not loaded yet.
      //
      return;
    }

    this.material.color.set(this.data.color);

    if (this.outlines) {
      //
      // We have computed the outline meshes already. Just update the
      // visibility.
      //
      for (const outline of this.outlines) {
        outline.visible = this.data.enabled;
      }
      return;
    }

    //
    // Traverse the meshes on the object and for each generate a
    // shadow outline mesh that is slightly bigger.
    //
    const meshes = [];
    this.outlines = [];
    this.el.object3D.traverseVisible((o) => {
      if (o.isMesh && o.geometry) {
        const outline = new THREE.Mesh(o.geometry, this.material);
        outline.visible = this.data.enabled;
        outline.scale.multiplyScalar(1.05);
        this.outlines.push(outline);
        meshes.push(o);
      }
    });

    //
    // Add the new meshes to their original counterpart, so they will
    // move together.
    //
    // Notice that this must happen after the end of traversal to not
    // generate infinite loops.
    //
    for (let i = 0; i < this.outlines.length; i++) {
      meshes[i].add(this.outlines[i]);
    }
  }
});

/**
 * Creates a glowing effect around the entity. Useful e.g. to provide
 * visual feedback on interaction.
 *
 * Port of example at
 * https://stemkoski.github.io/Three.js/Shader-Glow.html
 */
const GLOW_VERTEX_SHADER = `
uniform vec3 viewVector;
uniform float c;
uniform float p;
varying float intensity;
void main()
{
    vec3 vNormal = normalize( normalMatrix * normal );
    vec3 vNormel = normalize( normalMatrix * viewVector );
    intensity = pow( c - dot(vNormal, vNormel), p );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
const GLOW_FRAGMENT_SHADER = `
uniform vec3 glowColor;
varying float intensity;
void main()
{
    vec3 glow = glowColor * intensity;
    gl_FragColor = vec4( glow, 1.0 );
}
`;
window.AFRAME.registerComponent('glow', {
  schema: {
    enabled: {
      type: 'boolean',
      default: false
    },
    renderSide: {
      type: 'string',
      default: 'back',
      oneOf: ['back', 'front']
    },
    blending: {
      type: 'string',
      default: 'additive',
      oneOf: ['additive', 'normal']
    },
    color: {
      type: 'color',
      default: '#ffff00'
    },
    c: {
      type: 'number',
      default: 0.6
    },
    p: {
      type: 'number',
      default: 6
    }
  },
  init: function () {
    const size = _getObjectSize(this.el.object3D);
    if (size === 0) {
      //
      // Wait for the model to be loaded, then update again.
      //
      this.el.addEventListener('model-loaded', this.update.bind(this));
    }

    //
    // Create custom material from the shader code.
    //
    this.material = new THREE.ShaderMaterial(
      {
        uniforms:
        {
          'c': {
            type: 'f',
            value: 1.0
          },
          'p': {
            type: 'f',
            value: 1.4
          },
          glowColor: {
            type: 'c',
            value: new THREE.Color()
          },
          viewVector: {
            type: 'v3',
            value: document.querySelector('a-camera').object3D.position
          }
        },
        vertexShader:   GLOW_VERTEX_SHADER,
        fragmentShader: GLOW_FRAGMENT_SHADER,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      }
    );

  },
  update: function () {
    const size = _getObjectSize(this.el.object3D);
    if (size === 0) {
      //
      // Not loaded yet.
      //
      return;
    }

    const color = this.data.color.replace('#', '0x');

    const blending = this.data.blending === 'additive' ?
          THREE.AdditiveBlending : THREE.NormalBlending;

    const side = this.data.renderSide === 'front' ?
          THREE.FrontSide : THREE.BackSide;

    this.material.uniforms.c.value = this.data.c;
    this.material.uniforms.p.value = this.data.p;
    this.material.uniforms.glowColor.value.setHex(color);
    this.material.blending = blending;
    this.material.side = side;

    if (this.glowMesh) {
      this.glowMesh.visible = this.data.enabled;
      //
      // The glowing mesh was already computed. We can leave.
      //
      return;
    }

    const mesh = this.el.getObject3D('mesh');
    let geometry;
    let scale;
    if (mesh && mesh.geometry) {
      //
      // Our own mesh comes with a geometry. We use that for the shape
      // of our halo, just slightly bigger.
      //
      geometry = mesh.geometry;
    } else {
      //
      // We do not have a geometry directly on the mesh. We are going
      // to use a SphereGeometry the size of our object.
      //
      geometry = new THREE.SphereGeometry(size * 0.5);
    }
    this.glowMesh = new THREE.Mesh(geometry, this.material);
    this.glowMesh.visible = this.data.enabled;
    this.glowMesh.scale.multiplyScalar(1.2);

    //
    // The new mesh will become a child of the entity so that it will
    // move and transform with it.
    //
    this.el.object3D.add(this.glowMesh);
  }
});

/**
 * Ensure an entity never leaves the bounding box of a particular
 * item. When this happens, reposition it either to its starting
 * position or a custom pre-defined one.
 */
window.AFRAME.registerComponent('bound-to-entity', {
  schema: {
    entity: {type: 'selector', default: 'a-scene'},
    respawnPosition: {type: 'vec3', default: null}
  },
  init: function () {
    //
    // Default respawn position is the element's position right now.
    //
    this.respawnPosition = new THREE.Vector3();
    if (this.data.respawnPosition.x) {
      this.respawnPosition.copy(this.data.respawnPosition);
    } else {
      this.respawnPosition.copy(this.el.object3D.position);
    }

    this.entity = this.data.entity;

    //
    // We only check once per second to not weight too much on the
    // system.
    //
    this.interval = 1000;

    //
    // Compute the bounding box of the entity as soon as it is ready.
    //
    if (this.entity.object3DMap.mesh) {
      this.bounds = _getBoundinBox(this.entity.object3D).clone();
    } else {
      this.entity.addEventListener("object3dset", e => {
	if (e.detail.type === "mesh") {
          this.bounds = _getBoundinBox(this.entity.object3D).clone();
	}
      }, {once: true});
    }
  },
  tick: function (time, delta) {
    //
    // Every interval, if the component entity is out of bounds,
    // reposition it.
    //
    this.wait -= delta;
    if (!this.wait || this.wait <= 0) {
      if (this.bounds &&
          !this.bounds.containsPoint(this.el.object3D.position)) {
        this.el.object3D.position.copy(this.respawnPosition);
        //
        // On an entity that is physics-enabled, we also need to
        // resync the body to the new position.
        //
        if (this.el.components['ammo-body']) {
          this.el.components['ammo-body'].syncToPhysics();
        }
      }
      this.wait = this.interval;
    }
  }
});

/**
 * Ensure all sound entites set to autoplay do so as soon as the user
 * interacted with the page.
 */
window.AFRAME.registerComponent('autoplay-on-click', {
  schema: {
    entities: {type: 'selectorAll', default: 'a-sound,[sound]'}
  },
  init: function () {
    //
    // Some browsers will autoplay on their own in some circumstances,
    // but we stop them as well for consistency.
    //
    for (const entity of this.data.entities) {
      const sound = entity.components.sound;
      if (sound && sound.data.autoplay) {
        sound.stopSound();
      }
    }
    window.addEventListener('click', () => {
      for (const entity of this.data.entities) {
        const sound = entity.components.sound;
        if (sound && sound.data.autoplay) {
          sound.stopSound();
          sound.playSound();
        }
      }
    }, {once: true});
  }
});

/**
 * StandardHands Component
 *
 * A component to be put on entities running hand-controls (aka your
 * hands) that enables actions such as grabbing and stretching on
 * physics objects. Depends on ammo.
 *
 * Requires: physics
 *
 * Started from the grab component provided by
 * https://github.com/c-frame/aframe-physics-system and extended to
 * mimick some of the features by
 * https://github.com/c-frame/aframe-super-hands-component, but with
 * Ammo support and limited focus to the use cases in this package.
 *
 */
window.AFRAME.registerComponent('standard-hands', {
  init: function () {
    this.el.setAttribute('ammo-body', 'type: kinematic; emitCollisionEvents: true');
    this.el.setAttribute('ammo-shape', 'type: sphere; fit: manual; sphereRadius: 0.08;');

    this.GRABBED_STATE = 'grabbed';

    this.grabbing = false;
    this.hitEl =      /** @type {AFRAME.Element}    */ null;

    this.startScale = new THREE.Vector3();
    this.stretchInterval = null;

    // Bind event handlers
    this.onHitAmmo = this.onHitAmmo.bind(this);
    this.onGripOpen = this.onGripOpen.bind(this);
    this.onGripClose = this.onGripClose.bind(this);
    this.onThumbstickMoved = this.onThumbstickMoved.bind(this);
  },

  play: function () {
    const el = this.el;
    el.addEventListener('collidestart', this.onHitAmmo);
    el.addEventListener('gripdown', this.onGripClose);
    el.addEventListener('gripup', this.onGripOpen);
    el.addEventListener('trackpaddown', this.onGripClose);
    el.addEventListener('trackpadup', this.onGripOpen);
    el.addEventListener('triggerdown', this.onGripClose);
    el.addEventListener('triggerup', this.onGripOpen);
    el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
  },

  pause: function () {
    var el = this.el;
    el.removeEventListener('collidestart', this.onHitAmmo);
    el.removeEventListener('gripdown', this.onGripClose);
    el.removeEventListener('gripup', this.onGripOpen);
    el.removeEventListener('trackpaddown', this.onGripClose);
    el.removeEventListener('trackpadup', this.onGripOpen);
    el.removeEventListener('triggerdown', this.onGripClose);
    el.removeEventListener('triggerup', this.onGripOpen);
    el.removeEventListener('thumbstickmoved', this.onThumbstickMoved);
  },

  onThumbstickMoved: function (evt) {
    //
    // One-handed scale control of grabbed objects.
    //
    // Whe we are grabbing something and the thumbstick is moved up or
    // down, scale the entity up or down respectively.
    //

    if (!this.hitEl) { return; }

    if (evt.detail.y > 0.95) {
      //
      // Down
      //
      this.hitEl.object3D.scale.multiplyScalar(0.9);
    }
    if (evt.detail.y < -0.95) {
      //
      // Up
      //
      this.hitEl.object3D.scale.multiplyScalar(1.1);
    }

    //
    // For reference in case we want to handle other directions.
    //
    // if (evt.detail.x < -0.95) { console.log("LEFT"); }
    // if (evt.detail.x > 0.95) { console.log("RIGHT"); }
  },

  onGripClose: function (evt) {
    this.grabbing = true;
  },

  onGripOpen: function (evt) {
    this.grabbing = false;

    //
    // Hand A grabs, hand B stretches.
    //
    this._findOtherHand();
    const otherHandIsGrabbing = this.otherHand &&
          this.otherHand.components['standard-hands'].stretchInterval !== null;

    if (otherHandIsGrabbing) {
      //
      // Hand B should stop stretching to become hand A.
      //
      clearInterval(this.otherHand.components['standard-hands'].stretchInterval);
      this.otherHand.components['standard-hands'].stretchInterval = null;
    }

    clearInterval(this.stretchInterval);
    this.stretchInterval = null;

    if (!this.hitEl) { return; }

    //
    // Item will be detached from hand A.
    //
    this.hitEl.removeAttribute(`ammo-constraint__${this.el.id}`)
    if (otherHandIsGrabbing) {
      //
      // We move the constraint to hand B.
      //
      this.otherHand.components['standard-hands'].hitEl = this.hitEl;
      this.hitEl.setAttribute('ammo-body', {activationState: 'disableDeactivation'});
      this.hitEl.setAttribute(`ammo-constraint__${this.otherHand.id}`,
                              { target: `#${this.otherHand.id}` });
    } else {
      //
      // When this was the only hand grabbing the item, then this is
      // not grabbed anymore.
      //
      this.hitEl.setAttribute('ammo-body', {activationState: 'active'});
      this.hitEl.removeState(this.GRABBED_STATE);
    }

    //
    // This hand is not hitting anything anymoe.
    //
    this.hitEl = null;
  },

  _findOtherHand: function () {
    //
    // We require that the other hand is found here. What is important
    // is that we do it when we are sure both hands have been
    // initialized.
    //
    if (!this.otherHand) {
      for (const hand of document.querySelectorAll('[standard-hands]')) {
        if (hand !== this.el) {
          this.otherHand = hand;
        }
      }
    }
  },

  _calcHandsDistance: function () {
    this._findOtherHand();
    if (!this.otherHand) {
      return null;
    }
    return this.el.object3D.position.distanceTo(this.otherHand.object3D.position);
  },

  onHitAmmo: function (evt) {
    const hitEl = evt.detail.targetEl;
    // If the hand is not grabbing the element does not stick.
    // If we're already grabbing something you can't grab again.
    if (!hitEl || !this.grabbing || this.hitEl || this.stretchInterval) { return; }

    if (hitEl.is(this.GRABBED_STATE)) {
      //
      // Entity is already grabbed by another hand. we are going to
      // stretch it.
      //

      //
      // At every interval we multiply the starting scale of our item
      // for the ratio between the initial distance between our hands
      // and the distance now.
      //
      // Note that we do this via setInterval instead of a tick
      // handler. This seem to be necessary, at least on the Oculus
      // Browser for Quest 1...
      //
      const startHandsDistance = this._calcHandsDistance();
      if (startHandsDistance === null) {
        return;
      }
      this.startScale.copy(hitEl.object3D.scale);
      this.stretchInterval = setInterval(() => {
        const handsDistance = this._calcHandsDistance();
        const ratio = handsDistance / startHandsDistance;
        hitEl.object3D.scale.copy(this.startScale).multiplyScalar(ratio);
      }, 200);

    } else {
      //
      // Entity is being grabbed.
      //
      hitEl.addState(this.GRABBED_STATE);
      this.hitEl = hitEl;
      this.hitEl.setAttribute('ammo-body', {activationState: 'disableDeactivation'});
      this.hitEl.setAttribute(`ammo-constraint__${this.el.id}`,
                              { target: `#${this.el.id}` });
    }
  }
});

/**
 * StandardEyes Component
 *
 * A component for the camera that enables actions such as grabbing,
 * scaling and rotating on physics objects. Depends on ammo.
 *
 */
window.AFRAME.registerComponent('standard-eyes', {
  schema: {
    scaleUpCode: {default: 'NumpadAdd'},
    scaleDownCode: {default: 'NumpadSubtract'},
    grabCode: {default: 'KeyE'},
    rotateXcode: {default: 'KeyX'},
    rotateYcode: {default: 'KeyY'},
    rotateZcode: {default: 'KeyZ'},
    far: {type: 'number', default: 1.6}
  },
  init: function () {
    this.intersectedEl = null;

    if (this.el.tagName !== 'A-CAMERA') {
      throw 'standard-eyes must be set on the a-camera element on the scene';
    }

    this.cursor = this.el.querySelector('a-cursor');
    if (this.cursor) {
      console.warn('standard-eyes overrides existing cursor configuration');
    } else {
      this.cursor = document.createElement('a-cursor');
    }

    //
    // The cursor should interact only with physics bodies.
    //
    this.cursor.setAttribute('far', this.data.far);
    this.cursor.setAttribute('objects', '[ammo-body]');
    this.el.appendChild(this.cursor);

    //
    // The virtual hand is an invisible sphere that moves with
    // the cursor. It is also a kinematic body, but will not
    // partake the physics simulation. It is only needed as a
    // hook for the constraint.
    //
    this.hand = document.createElement('a-sphere');
    this.hand.id = 'a-camera-a-cursor-standard-eyes-hand';
    this.hand.setAttribute('visible', false);
    this.hand.setAttribute('radius', 0.01);
    this.hand.setAttribute('ammo-body', 'type: kinematic; activationState: disableSimulation;');
    this.hand.setAttribute('ammo-shape', 'type: sphere');
    this.cursor.appendChild(this.hand);

    //
    // Bind event handlers
    //
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  },

  play: function () {
    this.cursor.addEventListener('mouseenter', this.onMouseEnter);
    this.cursor.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  },

  pause: function () {
    this.cursor.removeEventListener('mouseenter', this.onMouseEnter);
    this.cursor.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  },

  onMouseEnter: function (evt) {
    if (!this.intersectedEl?.hasAttribute(`ammo-constraint__${this.hand.id}`) &&
	evt.detail.intersectedEl.components['ammo-body'].data.type !== 'static') {
      this.intersectedEl = evt.detail.intersectedEl;
      //
      // We fake collide with the intersected element.
      //
      this.intersectedEl.emit('collidestart', {targetEl: this.el});
    }
  },

  onMouseLeave: function (evt) {
    if (!this.intersectedEl?.hasAttribute(`ammo-constraint__${this.hand.id}`)) {
      this.intersectedEl = null;
    }
  },

  onKeyDown: function (evt) {
    const intersectedEl = this.intersectedEl;

    switch (evt.code) {
    case this.data.scaleUpCode:
      //
      // Scale up
      //
      intersectedEl?.object3D.scale.multiplyScalar(1.1);
      break;
    case this.data.scaleDownCode:
      //
      // Scale down
      //
      intersectedEl?.object3D.scale.multiplyScalar(0.9);
      break;
    case this.data.grabCode:
      //
      // Grabbing
      //
      if (this.cursor.components.raycaster.getIntersection(intersectedEl) &&
	  !intersectedEl.components[`ammo-constraint__${this.hand.id}`]) {
        intersectedEl.setAttribute('ammo-body', {activationState: 'disableDeactivation'});
        intersectedEl.setAttribute(`ammo-constraint__${this.hand.id}`,
				   { target: `#${this.hand.id}` });
      }
      break;
    case this.data.rotateXcode:
      //
      // Rotate on the X axis
      //
      if (intersectedEl &&
          !intersectedEl.components[`ammo-constraint__${this.hand.id}`]) {
        const rotation = intersectedEl.object3D.rotation.x;
        intersectedEl.object3D.rotateX(Math.PI / 2);
        intersectedEl.components['ammo-body'].syncToPhysics();
      }
      break;
    case this.data.rotateYcode:
      //
      // Rotate on the Y axis
      //
      if (intersectedEl &&
          !intersectedEl.components[`ammo-constraint__${this.hand.id}`]) {
        const rotation = intersectedEl.object3D.rotation.y;
        intersectedEl.object3D.rotateY(Math.PI / 2);
        intersectedEl.components['ammo-body'].syncToPhysics();
      }
      break;
    case this.data.rotateZcode:
      //
      // Rotate on the Z axis
      //
      if (intersectedEl &&
          !intersectedEl.components[`ammo-constraint__${this.hand.id}`]) {
        const rotation = intersectedEl.object3D.rotation.z;
        intersectedEl.object3D.rotateZ(Math.PI / 2);
        intersectedEl.components['ammo-body'].syncToPhysics();
      }
      break;
    }
  },

  onKeyUp: function (evt) {
    const intersectedEl = this.intersectedEl;

    switch (evt.code) {
    case this.data.grabCode:
      //
      // Releasing
      //
      if (intersectedEl &&
	  intersectedEl.components[`ammo-constraint__${this.hand.id}`]) {
        intersectedEl.setAttribute('ammo-body', {activationState: 'active'});
	intersectedEl.removeAttribute(`ammo-constraint__${this.hand.id}`);
      }
      break;
    }
  }
});

/**
 * StandardPainting Component
 *
 * This component makes sure painting behavior on hands can be turned
 * on and off consistently.
 *
 */
window.AFRAME.registerComponent('standard-painting', {
  schema: {
    owner: { type: 'string', default: 'local' },
    active: { type: 'boolean', default: false }
  },
  dependencies: ['hand-controls'],
  init: function () {
    const hand = this.el.components['hand-controls'].data.hand;

    this.el.setAttribute('brush', {
      hand: hand,
      owner: this.data.owner
    });
    this.el.setAttribute('paint-controls', {
      hand: hand,
      tooltips: false,
      hideTip: false,
      hideController: true
    });
    this.el.setAttribute('ui', '');

    this.components = [
      this.el.components['brush'],
      this.el.components['paint-controls'],
      this.el.components['ui']
    ];
    this.visibility = {};

    //
    // Wait for the component to start, then apply the "active" property.
    //
    this.el.addEventListener('play', this.update.bind(this), {once: true});
  },

  update: function () {
    this.data.active ? this.play() : this.pause();
  },

  play: function () {
    this.visibility.hideTip = false;
    this.visibility.hideController = true;
    this.el.setAttribute('paint-controls', this.visibility);
    for (const component of this.components) {
      component.play();
    }
  },

  pause: function () {
    this.visibility.hideTip = true;
    this.visibility.hideController = false;
    this.el.setAttribute('paint-controls', this.visibility);
    for (const component of this.components) {
      component.pause();
    }
  }
});

/**
 * Force Pushable component.
 *
 * Applies behavior to the current entity such that cursor clicks will
 * apply a strong impulse, pushing the entity away from the viewer.
 *
 * Requires: physics
 *
 * Lifted from https://github.com/c-frame/aframe-physics-system.
 */
window.AFRAME.registerComponent('force-pushable', {
  schema: {
    force: { default: 10 }
  },
  init: function () {

    this.pStart = new THREE.Vector3();
    this.sourceEl = this.el.sceneEl.querySelector('[camera]');

    this.el.addEventListener('click', this.forcePushAmmo.bind(this));

    this.force = new THREE.Vector3();
    this.pos = new THREE.Vector3();

    this.el.addEventListener("body-loaded", e => {
      this.impulseBtVector = new Ammo.btVector3();
      this.posBtVector = new Ammo.btVector3();
    });
  },

  forcePushAmmo: function (e) {

    if (!this.impulseBtVector) return;

    const el = this.el
    const force = this.force
    const impulseBt = this.impulseBtVector
    const pusher = e.detail.cursorEl.object3D
    force.copy(pusher.position)
    pusher.localToWorld(force)
    force.copy(el.object3D.position.sub(force))
    force.normalize();

    force.multiplyScalar(this.data.force);
    impulseBt.setValue(force.x, force.y, force.z)

    // use data from intersection to determine point at which to apply
    // impulse.
    const pos = this.pos
    const posBt = this.posBtVector
    pos.copy(e.detail.intersection.point)
    el.object3D.worldToLocal(pos)
    posBt.setValue(pos.x, pos.y, pos.z)

    el.body.activate()
    el.body.applyImpulse(impulseBt, posBt);
  }
});

//
// Local variables:
//    mode: javascript
//    js-indent-level: 2
//    indent-tabs-mode: nil
// End:
//
