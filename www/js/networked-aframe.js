// https://github.com/urish/aframe-camera-events
//
// The MIT License (MIT)

// Copyright (c) 2018 Uri Shaked and contributors

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

AFRAME.registerComponent('rotation-listener', {
  tick() {
    const newValue = this.el.getAttribute('rotation');
    const stringCoords = AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastValue !== stringCoords) {
      this.el.emit('rotationChanged', newValue);
      this.lastValue = stringCoords;
    }
  },
});

AFRAME.registerComponent('position-listener', {
  tick() {
    const newValue = this.el.getAttribute('position');
    const stringCoords = AFRAME.utils.coordinates.stringify(newValue);
    if (this.lastValue !== stringCoords) {
      this.el.emit('positionChanged', newValue);
      this.lastValue = stringCoords;
    }
  },
});

////


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

	el.setAttribute("position-listener", "");
	el.addEventListener('positionChanged', e => {
            websocket.send(JSON.stringify({
                id: data.id,
                type: "update",
                position: JSON.stringify(e.detail)
            }));
	});
        el.setAttribute("rotation-listener", "");
	el.addEventListener('rotationChanged', e => {
            websocket.send(JSON.stringify({
                id: data.id,
                type: "update",
                rotation: JSON.stringify(e.detail)
            }));
	});

        if (selfCleanup) {
            _selfCleanup(data.id);
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

    function _selfCleanup(id) {
        // Add an event listeners on page unload which will
        // notify peers about an item being deleted
        //console.log("Setting " + id + " for deletion on disconnect");
        window.addEventListener('beforeunload', (event) => {
            console.log("Unloading, deleting " + id);
            _remoteDelete(id);
        });
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

    this.attach = function(el, data, selfCleanup) {
        // Attach an existing element (e.g. the camera element)
        // to a remote object (e.g. an avatar) so that changes
        // happening on the existing element are reflected on
        // the remote one. This allows to display the local
        // element differently or not display it at all: in the
        // case of an avatar, generating the item locally would
        // obstruct the field of view.
        data.type = "create";
        data.position = JSON.stringify(camera.getAttribute("position"));
        data.rotation = JSON.stringify(camera.getAttribute("rotation"));

        _remoteCreate(el, data, selfCleanup);
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

    this.connect = function(onConnect) {
        // Connect to the websocket backend.
        if ("WebSocket" in window) {
	    websocket = new WebSocket(wsURI);
	} else {
	    websocket = new MozWebSocket(wsURI);
	}
        websocket.onopen = function(e) {
            console.log("Connected");
            onConnect();
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
    };
}
