// Inspired by https://github.com/urish/aframe-camera-events

AFRAME.registerComponent('absolute-rotation-listener', {
  getNewValue() {
    // We need to calculate the absolute rotation: it is often the
    // case that items such as the camera are enclosed in a
    // "cameraRig" and this element would be the one rotating. The
    // items on the remote counterpart are always attached directly to
    // the scene, so their positioning is absolute anyway.
    // Might be streamlined using the api, but would need
    // conversion...
    // var worldRotation = this.el.object3D.getWorldQuaternion(new THREE.Quaternion());
    const newValue = {'x': 0, 'y': 0, 'z': 0};
    var el = this.el;
    while (el && el !== this.el.sceneEl) {
      const parentValue = el.getAttribute('rotation');
      newValue.x+= parentValue.x;
      newValue.y+= parentValue.y;
      newValue.z+= parentValue.z;
      el = el.parentElement;
    }
    return newValue;
  },
  tick() {
    const newValue = this.getNewValue();
    const stringCoords = AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastValue !== stringCoords) {
      this.el.emit('absoluteRotationChanged', newValue);
      this.lastValue = stringCoords;
    }
  }
});

AFRAME.registerComponent('absolute-position-listener', {
  getNewValue() {
    // We need to calculate the absolute position: it is often the
    // case that items such as the camera are enclosed in a
    // "cameraRig" and this element would be the one moving. The items
    // on the remote counterpart are always attached directly to the
    // scene, so their positioning is absolute anyway.  The api does
    // not help us here, as the worldPosition would not take into
    // account things such as the visor pose, that the position
    // attribute embeds transparently and the position would have a y
    // of 0.
    // const newValue = this.el.object3D.getWorldPosition(new THREE.Vector3());
    const newValue = {'x': 0, 'y': 0, 'z': 0};
    var el = this.el;
    while (el && el !== this.el.sceneEl) {
      const parentValue = el.getAttribute('position');
      newValue.x+= parentValue.x;
      newValue.y+= parentValue.y;
      newValue.z+= parentValue.z;
      el = el.parentElement;
    }
    return newValue;
  },
  tick() {
    const newValue = this.getNewValue();
    const stringCoords = AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastValue !== stringCoords) {
      this.el.emit('absolutePositionChanged', newValue);
      this.lastValue = stringCoords;
    }
  }
});


//
// OpenACS Networked A-Frame
//
// This class connects to the OpenACS websocket backend (or any
// backend implementing the same message protocol) and provides the
// api to create "shared" objects in the context of a subscription (or
// "room"). Changes on the objects are broadcasted and reflected the
// same for every participant.
//
// The name is a not-so-subtle reference to another much better
// engineered project with the same purposes based on NodeJS:
// https://github.com/networked-aframe/networked-aframe
function NetworkedAframe (conf) {
    const wsURI = conf.wsURI;
    const scene = document.querySelector(conf.scene);

    var websocket;

    function _updateNestedProperty(el, property, value) {
        // A property is by default set by its attribute name on the
        // element. Optionally, one can specify a
        // data-#property name# attribute on a child element in the
        // template to say that this is the element where the
        // property should be updated. The value of this attribute
        // tells which is the real attribute we should change (by
        // default, the attribute named after the property is
        // changed).
        var elements = el.querySelectorAll("[data-" + property + "]");
        if (elements.length > 0) {
            for (e of elements) {
                var att = e.getAttribute("data-" + property);
                if (att.length <= 0) {
                    att = property;
                }
                e.setAttribute(att, value);
            }
        } else {
            el.setAttribute(property, value);
        }
    }

    function _create(data) {
        // Create an item locally
        var el = document.getElementById(data.id);
        if (el) {
            _update(el, data);
            console.warn("Element " + data.id + " already exists! Just update...");
        } else {
            el = document.querySelector(data.template).content.firstElementChild.cloneNode(true);
            el.setAttribute("id", data.id);
            _update(el, data);
            scene.appendChild(el);
            console.log("Element " + data.id + " created.");
        }
        return el;
    }

    function _update(el, data) {
        // Update an item locally
        if (data.position) {
            _updateNestedProperty(el, "position", JSON.parse(data.position));
        }
        if (data.rotation) {
            _updateNestedProperty(el, "rotation", JSON.parse(data.rotation));
        }
        if (data.color) {
            console.log("coloring " + data.id);
            _updateNestedProperty(el, "color", data.color);
        }
        if (data.name) {
            _updateNestedProperty(el, "name", data.name);
        }
        if (data.gesture) {
            el.setAttribute("remote-hand-controls", "gesture", data.gesture);
        }
    }

    function _delete(data) {
        // Delete an item locally
        var el = document.getElementById(data.id);
        if (!el) return;
        el.parentElement.removeChild(el);
    }

    function _remoteCreate(el, data, selfCleanup = true) {
        // Broadcast the creation of a new item to backend and
        // peers, and attach the listeners taking care of
        // notifying about changes.
        data.type = "create";
        websocket.send(JSON.stringify(data));

	el.setAttribute("absolute-position-listener", "");
	el.addEventListener('absolutePositionChanged', e => {
            websocket.send(JSON.stringify({
                id: data.id,
                type: "update",
                position: JSON.stringify(e.detail)
            }));
	});
        el.setAttribute("absolute-rotation-listener", "");
	el.addEventListener('absoluteRotationChanged', e => {
            websocket.send(JSON.stringify({
                id: data.id,
                type: "update",
                rotation: JSON.stringify(e.detail)
            }));
	});

        // This is a hand: also track gestures
        if (el.components["hand-controls"]) {
            el.addEventListener('elGesture', e => {
                websocket.send(JSON.stringify({
                    id: data.id,
                    type: "update",
                    gesture: e.detail.gesture
                }));
	    });
        }

        if (selfCleanup) {
            _selfCleanup(el, data.id);
        }
    }

    function _remoteDelete(id) {
        // Broadcast an item's deletion to backend and peers
        // console.log("Deleting " + id);
        websocket.send(JSON.stringify({
            id: id,
            type: "delete"
        }));
    }

    function _selfCleanup(el, id) {
        // Add an event listeners whenever VR is being left to notify
        // peers about an item being deleted
        //console.log("Setting " + id + " for deletion on disconnect");
        function handler(e) {
            console.log("Unloading, deleting " + id);
            _remoteDelete(id);
        }
        window.addEventListener('beforeunload', handler);
        el.sceneEl.addEventListener('exit-vr', handler);
    }

    function _onMessage(e) {
        // Handle the different kinds of websocket events
	var m = JSON.parse(e.data);
        switch (m.type) {
        case "create":
            _onRemoteCreate(m);
            break;
        case "delete":
            _onRemoteDelete(m);
            break;
        case "update":
            _onRemoteUpdate(m);
            break;
        default:
            console.error("Invalid message type: " + m.type);
        }
    }

    function _onRemoteCreate(data) {
        // React to create notification by creating the item
        // locally
        _create(data);
    }

    function _onRemoteUpdate(data) {
        // React to update notification by updating the local
        // item
        var el = document.getElementById(data.id);
        if (!el) return;
        _update(el, data);
    }

    function _onRemoteDelete(data) {
        // React to delete notification by deleting the local
        // item
        _delete(data);
    }

    this.attach = function(el, data, selfCleanup = true) {
        // Attach an existing element (e.g. the camera element)
        // to a remote object (e.g. an avatar) so that changes
        // happening on the existing element are reflected on
        // the remote one. This allows to display the local
        // element differently or not display it at all: in the
        // case of an avatar, generating the item locally would
        // obstruct the field of view.
        data.type = "create";
        data.position = JSON.stringify(el.getAttribute("position"));
        data.rotation = JSON.stringify(el.getAttribute("rotation"));

        _remoteCreate(el, data, selfCleanup);

        // VR enabled devices that re-enter the experience will be
        // relogged in
        if (selfCleanup) {
            var self = this;
            el.sceneEl.addEventListener("enter-vr", function() {
                self.attach(el, data, selfCleanup);
            });
        }
    };

    this.create = function(data, selfCleanup) {
        // Create a new element for all peers, which will listen
        // to and broadcast changes happening to it.
        var el = _create(data);
        _remoteCreate(el, data, selfCleanup);
    };

    this.delete = function(data) {
        // Delete an element locally and remotely.
        _delete(data);
        _remoteDelete(data.id);
    };

    this.connect = function() {
        // Connect to the websocket backend.
        if ("WebSocket" in window) {
	    websocket = new WebSocket(wsURI);
	} else {
	    websocket = new MozWebSocket(wsURI);
	}
        websocket.onopen = function(e) {
            console.log("Connected");
        };
	websocket.addEventListener("close", function(e) {
            console.log("Disconnected.");
        });
        websocket.addEventListener("message", _onMessage);
	websocket.addEventListener("error", function(e) {
            console.error(e.data);
        });

        setInterval(function() {
            websocket.send("ping");
        }, 60000);

        return websocket;
    };
}
