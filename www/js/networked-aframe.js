//
// OpenACS Networked A-Frame
//
// These components connect to the OpenACS websocket backend (or any
// backend implementing the same message protocol) and provides the
// api to create "shared" objects in the context of a subscription (or
// "room"). Changes on the objects are broadcasted and reflected the
// same for every participant.
// The name is a not-so-subtle reference to another much better
// engineered project with the same purposes based on NodeJS:
// https://github.com/networked-aframe/networked-aframe
AFRAME.registerSystem('oacs-networked-scene', {
  schema: {
    wsURI: {type: 'string'}
  },

  init: function () {
    if (!this.data.wsURI) {
      this.wsURI = this._defaultWsURI();
    } else {
      this.wsURI = this.data.wsURI;
    }
    this.websocket = this._connect();
    this.sceneEl = this.el.sceneEl;
  },

  remove: function() {
    if (this.websocket) {
      this.websocket.close();
    }
  },

  send: function(data) {
    var self = this;
    if (this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      this.websocket.addEventListener('open', function() {
        self.websocket.send(JSON.stringify(data));
      });
    }
  },

  _defaultWsURI: function() {
    return (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/aframe-vr/connect';
  },

  _updateNestedProperty: function (el, property, value) {
    // A property is by default set by its attribute name on the
    // element. Optionally, one can specify a
    // data-#property name# attribute on a child element in the
    // template to say that this is the element where the
    // property should be updated. The value of this attribute
    // tells which is the real attribute we should change (by
    // default, the attribute named after the property is
    // changed).
    var i = 0;
    var elementsToUpdate = el.querySelectorAll('[data-' + property + ']');
    for (e of elementsToUpdate) {
      var att = e.getAttribute('data-' + property);
      if (att.length <= 0) {
        att = property;
      }
      e.setAttribute(att, value);
      i++;
    }
    if (i === 0) {
      el.setAttribute(property, value);
    }
  },

  _create: function (data) {
    // Create an item locally
    var el = document.getElementById(data.id);
    if (el) {
      if (el.sceneEl === this.sceneEl) {
        this._update(el, data);
        console.warn('Element ' + data.id + ' already exists. Updating instead.');
      } else {
        console.error('Element ' + data.id + ' does not belong to the scene.');
      }
    } else {
      var template = document.querySelector(data.template);
      if (template) {
        el = template.content.firstElementChild.cloneNode(true);
        el.setAttribute('id', data.id);
        this._update(el, data);
        this.sceneEl.appendChild(el);
        console.log('Element ' + data.id + ' created.');
      } else {
        console.error('Template ' + template + ' not found while creating element ' + data.id + '.');
      }
    }
    return el;
  },

  _update: function (el, data) {
    // Update an item locally
    if (data.position) {
      this._updateNestedProperty(el, 'position', JSON.parse(data.position));
    }
    if (data.rotation) {
      this._updateNestedProperty(el, 'rotation', JSON.parse(data.rotation));
    }
    if (data.color) {
      this._updateNestedProperty(el, 'color', data.color);
    }
    if (data.name) {
      this._updateNestedProperty(el, 'name', data.name);
    }
    if (data.gesture) {
      el.setAttribute('remote-hand-controls', 'gesture', data.gesture);
    }
  },

  _delete: function (data) {
    // Delete an item locally
    var el = document.getElementById(data.id);
    if (!el) return;
    el.parentElement.removeChild(el);
  },

  _onMessage: function (e) {
    // Handle the different kinds of websocket events
    var m = JSON.parse(e.data);
    switch (m.type) {
    case 'create':
      this._onRemoteCreate(m);
      break;
    case 'delete':
      this._onRemoteDelete(m);
      break;
    case 'update':
      this._onRemoteUpdate(m);
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

  _onRemoteUpdate: function (data) {
    // React to update notification by updating the local
    // item
    var el = document.getElementById(data.id);
    if (!el || el.sceneEl !== this.sceneEl) return;
    this._update(el, data);
  },

  _onRemoteDelete: function (data) {
    // React to delete notification by deleting the local
    // item
    this._delete(data);
  },

  _connect: function () {
    var self = this;

    // Connect to the websocket backend.
    if ('WebSocket' in window) {
      websocket = new WebSocket(this.wsURI);
    } else {
      websocket = new MozWebSocket(this.wsURI);
    }
    websocket.onopen = function(e) {
      console.log('Connected');
    };
    websocket.addEventListener('close', function(e) {
      console.log('Disconnected.');
    });
    websocket.addEventListener('message', function(e) {
      self._onMessage(e);
    });
    websocket.addEventListener('error', function(e) {
      console.error(e.data);
    });

    setInterval(function() {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send('ping');
      } else {
        console.warn('Not connected, attempting reconnection...');
        self._connect();
      }
    }, 60000);

    return websocket;
  }
});

AFRAME.registerComponent('oacs-networked-entity', {
  schema: {
    networkId: {type: 'string'},
    template: {type: 'string'},
    color: {type: 'color', default: ''},
    name: {default: ''},
    selfCleanup: {type: 'boolean', default: true}
  },

  init: function () {
    this.networkedScene = this.el.sceneEl.systems['oacs-networked-scene'];
    this.template = this.data.template;
    this.networkId = this.data.networkId ? this.data.networkId : this.el.getAttribute('id');
    this.name = this.data.name;
    this.selfCleanup = this.data.selfCleanup;

    this.lastPosition = null;
    this.lastRotation = null;

    this.color = this.data.color;
    if (this.color.length === 0) {
      this.color = '#' + Math.random().toString(16).substr(2,6);
    }

    this._attach();
  },

  remove: function() {
    var data = {
      id: this.networkId,
      type: 'delete'
    };
    this.networkedScene.send(data);
  },

  _attach: function () {
    var self = this;
    function doAttach() {
      const data = {
        type: 'create',
        id: self.networkId,
        name: self.name,
        template: self.template,
        color: self.color
      };

      self.networkedScene.send(data);

      self.el.setAttribute('absolute-position-listener', '');
      self.el.addEventListener('absolutePositionChanged', e => {
        const data = {
          id: self.networkId,
          type: 'update',
          position: JSON.stringify(e.detail)
        };
        self.networkedScene.send(data);
      });

      self.el.setAttribute('absolute-rotation-listener', '');
      self.el.addEventListener('absoluteRotationChanged', e => {
        const data = {
          id: self.networkId,
          type: 'update',
          rotation: JSON.stringify(e.detail)
        };
        self.networkedScene.send(data);
      });

      // This is a hand: also track gestures
      if (self.el.components['hand-controls']) {
        self.el.addEventListener('elGesture', e => {
          const data = {
            id: self.networkId,
            type: 'update',
            gesture: e.detail.gesture
          };
          self.networkedScene.send(data);
        });
      }

      if (self.selfCleanup) {
        // window.onbeforeunload is not triggered easily on e.g. oculus,
        // because one does seldom close the app explicitly. We delete
        // the avatar on exit of immersive mode
        if (AFRAME.utils.device.checkHeadsetConnected()) {
          self.el.sceneEl.addEventListener('exit-vr', function() {
            self.remove();
          });
        }
        window.addEventListener('beforeunload', function() {
          self.remove();
        });
      }
    }

    // Not all clients will support controllers, therefore, we attach
    // the hands to the network only upon controller connection.
    if (this.el.components['hand-controls']) {
      this.el.addEventListener('controllerconnected', function() {
        doAttach();
      });
    } else {
      doAttach();
    }
  }
});
