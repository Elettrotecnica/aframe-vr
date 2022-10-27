
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
    // By default, Janus videoroom plugin wants integer ids, but one
    // can set the 'string_ids' property to true in the plugin conf to
    // use strings. In such setup, one must also set 'stringIds'
    // component flag to true.
    var id = this.data.id ? this.data.id : this.el.getAttribute('id');
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
      var muted = this.pluginHandle.isAudioMuted();
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

  // Adds a track to the scene
  _addTrack: function (feed, track) {
    if (!feed) {
      return;
    }
    if (!this.remoteTracks[feed.id]) {
      this.remoteTracks[feed.id] = [];
    } else if (this.remoteTracks[feed.id].includes(track)) {
      return;
    }
    this.remoteTracks[feed.id].push(track);

    let id = this.stringIds ? feed.id : feed.display;
    let e = document.getElementById(id);
    if (!e || ! e.object3D) {
      return;
    }

    let stream = new MediaStream([track]);
    if (track.kind === 'video') {
      // Track is a video: we require a video element that will
      // become the material of our object.
      let v = e.querySelector('video');
      if (!v) {
        v = document.createElement('video');
        v.autoplay = true;
        // We create an element with a unique id so that aframe won't
        // try to reuse old video elements from the cache.
        v.id = track.id + (new Date()).getTime();
        e.appendChild(v);
      }
      v.srcObject = stream;
      e.setAttribute('material', 'src', '#' + v.id);
    } else if (track.kind === 'audio') {
      // Track is audio: we attach it to the element.
      // TODO: right now we assume audio to be positional.
      e.setAttribute('mediastream-sound', '');
      e.components['mediastream-sound'].setMediaStream(stream);
      // We also attach the listener component to track sound on
      // this entity and be able to react to sound.
      e.setAttribute('mediastream-listener', '');
      e.components['mediastream-listener'].setMediaStream(stream);
    }

  },

  // Deletes a track from the scene
  _removeTrack: function (feed, track) {
    if (!feed) {
      return;
    }

    let id = this.stringIds ? feed.id : feed.display;
    let e = document.getElementById(id);

    if (!e || ! e.object3D) {
      return;
    }

    if (track.kind === 'video') {
      e.setAttribute('material', 'src', null);
      let v = e.querySelector('video');
      if (v) {
        v.parentElement.removeChild(v);
      }
    } else {
      e.removeAttribute('mediastream-sound');
      e.removeAttribute('mediastream-listener');
    }
  },

  _unsubscribeFrom: function (id) {
    // Unsubscribe from this publisher
    var feed = this.feedStreams[id];
    if (!feed) {
      return;
    }

    window.Janus.debug('Feed ' + id + ' (' + feed.display + ') has left the room, detaching');

    for (track of this.remoteTracks[feed.id]) {
      console.log('removing track', track, feed);
      this._removeTrack(feed, track);
    }

    if (this.bitrateTimer[id]) {
      clearInterval(this.bitrateTimer[id]);
    }
    this.bitrateTimer[id] = null;
    delete this.simulcastStarted[id];
    delete this.feeds[id];
    delete this.feedStreams[id];
    // Send an unsubscribe request
    var unsubscribe = {
      request: 'unsubscribe',
      streams: [{ feed: id }]
    };
    if (this.remoteFeed != null) {
      this.remoteFeed.send({ message: unsubscribe });
    }
    delete this.subscriptions[id];
    delete this.remoteTracks[id];
  },

  _publishOwnFeed: function () {
    // Publish our stream

    // We want sendonly audio
    let tracks = [];
    tracks.push({ type: 'audio', capture: true, recv: false });

    var self = this;
    this.pluginHandle.createOffer({
      tracks: tracks,
      success: function (jsep) {
        window.Janus.debug('Got publisher SDP!');
        window.Janus.debug(jsep);
        var publish = { request: 'configure', audio: true, video: false };
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
      var subscription = [];
      for (var s in sources) {
        var streams = sources[s];
        for (var i in streams) {
          var stream = streams[i];
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
    var self = this;
    // If we got here, we're creating a new handle for the subscriptions (we only need one)
    this.creatingSubscription = true;
    this.janus.attach({
      plugin: 'janus.plugin.videoroom',
      opaqueId: self.display,
      success: function (pluginHandle) {
        self.remoteFeed = pluginHandle;
        self.remoteTracks = {};
        window.Janus.log('Plugin attached! (' + self.remoteFeed.getPlugin() + ', id=' + self.remoteFeed.getId() + ')');
        window.Janus.log('  -- This is a multistream subscriber');
        // Prepare the streams to subscribe to, as an array: we have the list of
        // streams the feed is publishing, so we can choose what to pick or skip
        var subscription = [];
        for (var s in sources) {
          var streams = sources[s];
          for (var i in streams) {
            var stream = streams[i];
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
        var subscribe = {
          request: 'join',
          room: self.room,
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
        var event = msg['videoroom'];
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
            var mid = msg['mid'];
            var substream = msg['substream'];
            var temporal = msg['temporal'];
            if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              // Check which this feed this refers to
              var sub = self.subStreams[mid];
              var feed = self.feedStreams[sub.feed_id];
              if (!self.simulcastStarted[sub.feed_id]) {
                self.simulcastStarted[sub.feed_id] = true;
              }

              // Check the substream
              var index = feed;
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
          for (var i in msg['streams']) {
            var mid = msg['streams'][i]['mid'];
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
              var body = { request: 'start', room: self.room };
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
        var sub = self.subStreams[mid];
        var feed = self.feedStreams[sub.feed_id];
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
        for (var i in self.feeds) {
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
    var self = this;

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
                    var register = {
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
                    // We might cap the bitrate here
                    // var bitrate = self.bitrate;
                    // if (bitrate === 0) {
                    //   window.Janus.log('Not limiting bandwidth via REMB');
                    // } else {
                    //   window.Janus.log('Capping bandwidth to ' + bitrate + ' via REMB');
                    // }
                    // self.pluginHandle.send({ message: { request: 'configure', bitrate: bitrate }});
                  },
                  slowLink: function (uplink, lost, mid) {
                    window.Janus.warn('Janus reports problems ' + (uplink ? 'sending' : 'receiving') +
                                      ' packets on mid ' + mid + ' (' + lost + ' lost packets)');
                  },
                  onmessage: function (msg, jsep) {
                    window.Janus.debug(' ::: Got a message (publisher) :::', msg);
                    var event = msg['videoroom'];
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
                          var list = msg['publishers'];
                          window.Janus.debug('Got a list of available publishers/feeds:', list);
                          var sources = null;
                          for (var f in list) {
                            if (list[f]['dummy']) {
                              continue;
                            }
                            var id = list[f]['id'];
                            var display = list[f]['display'];
                            var streams = list[f]['streams'];
                            for (var i in streams) {
                              var stream = streams[i];
                              stream['id'] = id;
                              stream['display'] = display;
                            }
                            self.feedStreams[id] = {
                              id: id,
                              display: display,
                              streams: streams
                            }
                            window.Janus.debug('  >> [' + id + '] ' + display + ':', streams);
                            if (!sources) {
                              sources = [];
                            }
                            sources.push(streams);
                          }
                          if (sources) {
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
                          var streams = msg['streams'];
                          for (var i in streams) {
                            var stream = streams[i];
                            stream['id'] = self.id;
                            stream['display'] = self.display;
                          }
                          self.feedStreams[self.id] = {
                            id: self.id,
                            display: self.display,
                            streams: streams
                          }
                        } else if (msg['publishers']) {
                          var list = msg['publishers'];
                          window.Janus.debug('Got a list of available publishers/feeds:', list);
                          var sources = null;
                          for (var f in list) {
                            if (list[f]['dummy']) {
                              continue;
                            }
                            var id = list[f]['id'];
                            var display = list[f]['display'];
                            var streams = list[f]['streams'];
                            for (var i in streams) {
                              var stream = streams[i];
                              stream['id'] = id;
                              stream['display'] = display;
                            }
                            self.feedStreams[id] = {
                              id: id,
                              display: display,
                              streams: streams
                            }
                            window.Janus.debug('  >> [' + id + '] ' + display + ':', streams);
                            if (!sources) {
                              sources = [];
                            }
                            sources.push(streams);
                          }
                          if (sources) {
                            self._subscribeTo(sources);
                          }
                        } else if (msg['leaving']) {
                          // One of the publishers has gone away?
                          var leaving = msg['leaving'];
                          window.Janus.log('Publisher left: ' + leaving);
                          self._unsubscribeFrom(leaving);
                        } else if (msg['unpublished']) {
                          // One of the publishers has unpublished?
                          var unpublished = msg['unpublished'];
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
  }
});

//
// Local variables:
//    mode: javascript
//    js-indent-level: 2
//    indent-tabs-mode: nil
// End:
//
