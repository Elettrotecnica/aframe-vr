
/**
 * A component connecting an entity to a janus-gateway backend via
 * the videoroom plugin.
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

    if (!this.data.wsURI) {
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
      this.room = parseInt(this.room, 10);
    }

    this.id = null;
    this.janus = null;
    this.pluginHandle = null;
    this.privateId = null;
    this.stream = null;
    this.feeds = {};

    this._connect();
  },

  update: function (oldData) {
    this._toggleMute();
  },

  _toggleMute: function () {
    if (this.pluginHandle) {
      var muted = this.pluginHandle.isAudioMuted();
      if (this.data.muted && !muted) {
        console.log('Muting local stream...');
        this.pluginHandle.muteAudio();
      }
      if (!this.data.muted && muted) {
        console.log('Unmuting local stream...');
        this.pluginHandle.unmuteAudio();
      }
    }
  },

  _removeRemoteFeed: function (feed) {
    var e = document.getElementById(this.stringIds ? feed.rfid : feed.rfdisplay);
    if (e) {
      e.removeAttribute('mediastream-sound');
    }
    window.Janus.debug('Feed ' + feed.rfid + ' (' + feed.rfdisplay + ') has left the room, detaching');
    feed.detach();
  },

  _defaultURI: function () {
    if (window.location.protocol === 'http:') {
      return 'http://' + window.location.hostname + ':8088/janus';
    } else {
      return 'https://' + window.location.hostname + ':8089/janus';
    }
  },

  _publishOwnFeed: function () {
    var self = this;
    // Publish our stream
    this.pluginHandle.createOffer(
      {
        // Add data:true here if you want to publish datachannels as well
        media: { audioRecv: false, videoRecv: false, audioSend: true, videoSend: false }, // Publishers are sendonly
        // If you want to test simulcasting (Chrome and Firefox only), then
        // pass a ?simulcast=true when opening this demo page: it will turn
        // the following 'simulcast' property to pass to janus.js to true
        simulcast: false,
        simulcast2: false,
        success: function (jsep) {
          window.Janus.debug('Got publisher SDP!', jsep);
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
          // refer to the text in janus.plugin.videoroom.jcfg for more details
          self.pluginHandle.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          window.Janus.error('WebRTC error:', error);
        }
      });
  },

  _newRemoteFeed: function (id, display, audio, video) {
    var self = this;
    // A new feed has been published, create a new plugin handle and attach to it as a subscriber
    var remoteFeed = null;
    this.janus.attach({
      plugin: 'janus.plugin.videoroom',
      success: function (pluginHandle) {
        remoteFeed = pluginHandle;
        remoteFeed.simulcastStarted = false;
        window.Janus.log('Plugin attached! (' + remoteFeed.getPlugin() + ', id=' + remoteFeed.getId() + ')');
        window.Janus.log('  -- This is a subscriber');
        // We wait for the plugin to send us an offer
        var subscribe = {
          request: 'join',
          room: self.room,
          pin: self.pin,
          ptype: 'subscriber',
          feed: id,
          private_id: self.privateId
        };
        // In case you don't want to receive audio, video or data, even if the
        // publisher is sending them, set the 'offer_audio', 'offer_video' or
        // 'offer_data' properties to false (they're true by default), e.g.:
        // subscribe['offer_video'] = false;
        // For example, if the publisher is VP8 and this is Safari, let's avoid video
        if (window.Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
            (video === 'vp9' || (video === 'vp8' && !window.Janus.safariVp8))) {
          if (video) {
            video = video.toUpperCase();
          }
          console.warn('Publisher is using ' + video + ', but Safari doesn\'t support it: disabling video');
          subscribe['offer_video'] = false;
        }
        remoteFeed.videoCodec = video;
        remoteFeed.send({ message: subscribe });
      },
      error: function (error) {
        window.Janus.error('  -- Error attaching plugin...', error);
      },
      onmessage: function (msg, jsep) {
        window.Janus.debug(' ::: Got a message (subscriber) :::', msg);
        var event = msg['videoroom'];
        window.Janus.debug('Event: ' + event);
        if (msg['error']) {
          console.error(msg['error']);
        } else if (event) {
          if (event === 'attached') {
            // Subscriber created and attached
            remoteFeed.rfid = msg['id'];
            remoteFeed.rfdisplay = msg['display'];
            self.feeds[remoteFeed.rfid] = remoteFeed;
            window.Janus.log('Successfully attached to feed ' + remoteFeed.rfid + ' (' + remoteFeed.rfdisplay + ') in room ' + msg['room']);
          } else if (event === 'event') {
            // Check if we got a simulcast-related event from this publisher
            // var substream = msg['substream'];
            // var temporal = msg['temporal'];
          }
        } else {
          // What has just happened?
        }
        if (jsep) {
          window.Janus.debug('Handling SDP as well...', jsep);
          // Answer and attach
          remoteFeed.createAnswer({
            jsep: jsep,
            // Add data:true here if you want to subscribe to datachannels as well
            // (obviously only works if the publisher offered them in the first place)
            media: { audioRecv: true, videoRecv: true, audioSend: false, videoSend: false },
            success: function (jsep) {
              window.Janus.debug('Got SDP!', jsep);
              var body = { request: 'start', room: self.room };
              remoteFeed.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              window.Janus.error('WebRTC error:', error);
            }
          });
        }
      },
      iceState: function (state) {
        window.Janus.log('ICE state of this WebRTC PeerConnection (feed #' + remoteFeed.rfid + ') changed to ' + state);
      },
      webrtcState: function (on) {
        window.Janus.log('Janus says this WebRTC PeerConnection (feed #' + remoteFeed.rfid + ') is ' + (on ? 'up' : 'down') + ' now');
      },
      onlocalstream: function (stream) {
        // The subscriber stream is recvonly, we don't expect anything here
      },
      onremotestream: function (stream) {
        window.Janus.debug('Remote feed #' + remoteFeed.rfid + ', stream:', stream);
        const e = document.getElementById(self.stringIds ? id : display);
        if (e) {
          // If this is a video stream, check that the element is a
          // a-video and set this stream as its source using a dummy
          // video element created on the fly.
          const videoTracks = stream.getVideoTracks();
          if (videoTracks &&
              videoTracks.length > 0 &&
              !e.src &&
              e.tagName === 'A-VIDEO') {
            var v = document.createElement('video');
            v.autoplay = true;
            v.srcObject = stream;
            v.id = e.id + '-video';
            document.body.appendChild(v);
            e.setAttribute('src', '#' + v.id);
            return;
          }

          // Audio is the fallback and what you should expect for
          // avatars of people inside of VR.
          const audioTracks = stream.getAudioTracks();
          console.log(audioTracks);
          if (audioTracks &&
              audioTracks.length > 0 &&
              !e.getAttribute('mediastream-sound')) {
              e.setAttribute('mediastream-sound', '');
            e.components['mediastream-sound'].setMediaStream(stream);
          }
        }
      },
      oncleanup: function () {
        window.Janus.log(' ::: Got a cleanup notification (remote feed ' + id + ') :::');
      }
    });
  },

  _connect: function () {
    var self = this;

    // Initialize the library
    window.Janus.init({
      debug: this.debug,
      callback: function () {
        if (!window.Janus.isWebrtcSupported()) {
          window.alert('No WebRTC support... ');
          return;
        }
        // Create session
        self.janus = new window.Janus({
          server: self.URI,
          success: function () {
            // Attach to VideoRoom plugin
            self.janus.attach(
              {
                plugin: 'janus.plugin.videoroom',
                success: function (pluginHandle) {
                  self.pluginHandle = pluginHandle;
                  window.Janus.log('Plugin attached! (' + self.pluginHandle.getPlugin() + ', id=' + self.pluginHandle.getId() + ')');
                  window.Janus.log('  -- This is a publisher/manager');
                  // Prepare the username registration
                  var register = {
                    request: 'join',
                    room: self.room,
                    pin: self.pin,
                    ptype: 'publisher',
                    display: self.display
                  };
                  if (this.id) {
                    register.id = this.id;
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
                mediaState: function (medium, on) {
                  window.Janus.log('Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium);
                },
                webrtcState: function (on) {
                  window.Janus.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
                  // For now we do not set the bitrate
                  // self.pluginHandle.send({ message: { request: 'configure', bitrate: bitrate }});
                },
                onmessage: function (msg, jsep) {
                  window.Janus.debug(' ::: Got a message (publisher) :::', msg);
                  var event = msg['videoroom'];
                  var list, f, id, display, audio, video, remoteFeed, e;
                  window.Janus.debug('Event: ' + event);
                  if (event) {
                    if (event === 'joined') {
                      // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                      self.id = msg['id'];
                      self.privateId = msg['private_id'];
                      window.Janus.log('Successfully joined room ' + msg['room'] + ' with ID ' + self.id);
                      self._publishOwnFeed();
                      // Any new feed to attach to?
                      if (msg['publishers']) {
                        list = msg['publishers'];
                        window.Janus.debug('Got a list of available publishers/feeds:', list);
                        for (f in list) {
                          id = list[f]['id'];
                          display = list[f]['display'];
                          audio = list[f]['audio_codec'];
                          video = list[f]['video_codec'];
                          window.Janus.debug('  >> [' + id + '] ' + display + ' (audio: ' + audio + ', video: ' + video + ')');
                          self._newRemoteFeed(id, display, audio, video);
                        }
                      }
                    } else if (event === 'destroyed') {
                      // The room has been destroyed
                      window.Janus.warn('The room has been destroyed!');
                    } else if (event === 'event') {
                      // Any new feed to attach to?
                      if (msg['publishers']) {
                        list = msg['publishers'];
                        window.Janus.debug('Got a list of available publishers/feeds:', list);
                        for (f in list) {
                          id = list[f]['id'];
                          display = list[f]['display'];
                          audio = list[f]['audio_codec'];
                          video = list[f]['video_codec'];
                          window.Janus.debug('  >> [' + id + '] ' + display + ' (audio: ' + audio + ', video: ' + video + ')');
                          self._newRemoteFeed(id, display, audio, video);
                        }
                      } else if (msg['leaving']) {
                        // One of the publishers has gone away?
                        var leaving = msg['leaving'];
                        window.Janus.log('Publisher left: ' + leaving);
                        remoteFeed = self.feeds[leaving];
                        if (remoteFeed) {
                          self._removeRemoteFeed(remoteFeed);
                          delete self.feeds[leaving];
                        }
                      } else if (msg['unpublished']) {
                        // One of the publishers has unpublished?
                        var unpublished = msg['unpublished'];
                        window.Janus.log('Publisher left: ' + unpublished);
                        if (unpublished === 'ok') {
                          // That's us
                          self.pluginHandle.hangup();
                          return;
                        }
                        remoteFeed = self.feeds[unpublished];
                        if (remoteFeed) {
                          self._removeRemoteFeed(remoteFeed);
                          delete self.feeds[unpublished];
                        }
                      } else if (msg['error']) {
                        if (msg['error_code'] === 426) {
                          // This is a 'no such room' error: give a more meaningful description
                          window.alert('no such room');
                        } else {
                          window.alert(msg['error']);
                        }
                      }
                    }
                  }
                  if (jsep) {
                    window.Janus.debug('Handling SDP as well...', jsep);
                    self.pluginHandle.handleRemoteJsep({ jsep: jsep });
                    // Check if any of the media we wanted to publish has
                    // been rejected (e.g., wrong or unsupported codec)
                    audio = msg['audio_codec'];
                    if (self.stream &&
                        self.stream.getAudioTracks() &&
                        self.stream.getAudioTracks().length > 0 &&
                        !audio) {
                      // Audio has been rejected
                      console.warn('Our audio stream has been rejected, viewers won\'t hear us');
                    }
                    video = msg['video_codec'];
                    if (self.stream &&
                        self.stream.getVideoTracks() &&
                        self.stream.getVideoTracks().length > 0 &&
                        !video) {
                      // Video has been rejected
                      console.warning('Our video stream has been rejected, viewers won\'t see us');
                    }
                  }
                },
                onlocalstream: function (stream) {
                  window.Janus.debug(' ::: Got a local stream :::', stream);
                  self.stream = stream;
                },
                onremotestream: function (stream) {
                  // The publisher stream is sendonly, we don't expect anything here
                },
                oncleanup: function () {
                  window.Janus.log(' ::: Got a cleanup notification: we are unpublished now :::');
                  self.stream = null;
                }
              });
          },
          error: function (error) {
            window.Janus.error(error);
          },
          destroyed: function () {
            // window.location.reload();
          }
        });
      }
    });
  }
});
