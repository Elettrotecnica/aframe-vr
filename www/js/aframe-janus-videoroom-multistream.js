
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
    // this.debug = "all";
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

    this.remoteFeed = null;
    this.feeds = {};
    this.feedStreams = {};
    this.subStreams = {};
    this.slots = {};
    this.mids = {};
    this.subscriptions = {};
    this.localTracks = {};
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

  _unsubscribeFrom: function (id) {
    // Unsubscribe from this publisher
    let feed = this.feedStreams[id];
    if (!feed) {
      return;
    }

    // We get rid of the aframe element
    const e = document.getElementById(self.stringIds ? feed.id : feed.display);
    if (e) {
      e.parentElement.removeChild(e);
    }

    window.Janus.debug('Feed ' + id + ' (' + feed.display + ') has left the room, detaching');
    if (this.bitrateTimer[feed.slot]) {
      clearInterval(this.bitrateTimer[feed.slot]);
    }
    this.bitrateTimer[feed.slot] = null;
    delete this.simulcastStarted[feed.slot];
    delete this.feeds[feed.slot];
    delete this.feedStreams[id];
    // Send an unsubscribe request
    let unsubscribe = {
      request: 'unsubscribe',
      streams: [{ feed: id }]
    };
    if (this.remoteFeed !== null) {
      this.remoteFeed.send({ message: unsubscribe });
    }
    delete subscriptions[id];
  },

  _publishOwnFeed: function () {
    var self = this;

    // Publish our stream

    // We want sendonly audio
    let tracks = [];
    tracks.push({ type: 'audio', capture: true, recv: false });

    this.pluginHandle.createOffer(
      {
        tracks: tracks,
        success: function (jsep) {
          window.Janus.debug('Got publisher SDP!');
          window.Janus.debug(jsep);
          let publish = { request: 'configure', audio: true, video: false };
          self.pluginHandle.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          window.Janus.error('WebRTC error:', error);
        }
      });
  },

  _subscribeTo: function (sources) {
    var self = this;
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
      let added = null, removed = null;
      for (let s in sources) {
        let streams = sources[s];
        for (let i in streams) {
          let stream = streams[i];
          if (stream.type === 'video' && window.Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
              (stream.codec === 'vp9' || (stream.codec === 'vp8' && !window.Janus.safariVp8))) {
            //
            // If the publisher is VP8/VP9 and this is an older Safari, let's avoid video
            //
            window.Janus.warn('Publisher is using ' + stream.codec.toUpperCase +
                              ', but Safari does not support it: disabling video stream #' + stream.mindex);

          } else if (stream.disabled) {
            //
            // Unsubscribe
            //
            window.Janus.log('Disabled stream:', stream);
            if (!removed) {
              removed = [];
            }
            removed.push({
              feed: stream.id,// This is mandatory
              mid: stream.mid// This is optional (all streams, if missing)
            });
            delete this.subscriptions[stream.id][stream.mid];
          } else if (this.subscriptions[stream.id] && this.subscriptions[stream.id][stream.mid]) {
            //
            // Already subscribed
            //
            window.Janus.log('Already subscribed to stream, skipping:', stream);
            continue;
          } else {
            //
            // Subscribe
            //
            if (!added) {
              added = [];
            }
            added.push({
              feed: stream.id,// This is mandatory
              mid: stream.mid// This is optional (all streams, if missing)
            });
            if (!subscriptions[stream.id]) {
              subscriptions[stream.id] = {};
            }
            subscriptions[stream.id][stream.mid] = true;
          }
        }
      }
      //
      // See if we need to update our subscriptions
      //
      if (added || removed) {
        let update = { request: 'update' };
        if (added) {
          update.subscribe = added;
        }
        if (removed) {
          update.unsubscribe = removed;
        }
        this.remoteFeed.send({ message: update });
      }

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
        self.remoteTracks = {};
        window.Janus.log('Plugin attached! (' + self.remoteFeed.getPlugin() + ', id=' + self.remoteFeed.getId() + ')');
        window.Janus.log('  -- This is a multistream subscriber');
        // Prepare the streams to subscribe to, as an array: we have the list of
        // streams the feed is publishing, so we can choose what to pick or skip
        let subscription = [];
        for (let s in sources) {
          let streams = sources[s];
          for (let i in streams) {
            let stream = streams[i];
            // If the publisher is VP8/VP9 and this is an older Safari, let's avoid video
            if (stream.type === 'video' && window.Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
                (stream.codec === 'vp9' || (stream.codec === 'vp8' && !window.Janus.safariVp8))) {
              window.Janus.warn('Publisher is using ' + stream.codec.toUpperCase +
                                ', but Safari does not support it: disabling video stream #' + stream.mindex);
              continue;
            }
            if (stream.disabled) {
              window.Janus.log('Disabled stream:', stream);
              // TODO Skipping for now, we should unsubscribe
              continue;
            }
            if(self.subscriptions[stream.id] && self.subscriptions[stream.id][stream.mid]) {
              window.Janus.log('Already subscribed to stream, skipping:', stream);
              continue;
            }

            subscription.push({
              feed: stream.id,// This is mandatory
              mid: stream.mid// This is optional (all streams, if missing)
            });

            if(!self.subscriptions[stream.id]) {
              self.subscriptions[stream.id] = {};
            }
            self.subscriptions[stream.id][stream.mid] = true;
          }
        }
        // We wait for the plugin to send us an offer
        let subscribe = {
          request: "join",
          room: self.room,
          ptype: "subscriber",
          streams: subscription,
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
        let event = msg['videoroom'];
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
            let mid = msg['mid'];
            let substream = msg['substream'];
            let temporal = msg['temporal'];
            if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              // Check which this feed this refers to
              let sub = self.subStreams[mid];
              let feed = self.feedStreams[sub.feed_id];
              if(!self.simulcastStarted[slot]) {
                self.simulcastStarted[slot] = true;
              }
              //
              // We just received notice that there's been a switch.
              //
              // Check what happened to the substream
              if (substream === 0) {
                window.Janus.log('Switched simulcast substream! (lower quality)');
              } else if (substream === 1) {
                window.Janus.log('Switched simulcast substream! (normal quality)');
              } else if (substream === 2) {
                window.Janus.log('Switched simulcast substream! (higher quality)');
              }
              // Check what happened to the temporal layer
              if (temporal === 0) {
                window.Janus.log('Capped simulcast temporal layer! (lowest FPS)');
              } else if (temporal === 1) {
                window.Janus.log('Capped simulcast temporal layer! (medium FPS)');
              } else if (temporal === 2) {
                window.Janus.log('Capped simulcast temporal layer! (highest FPS)');
              }
            }
          } else {
            // What has just happened?
          }
        }
        if (msg['streams']) {
          // Update map of subscriptions by mid
          for (let i in msg['streams']) {
            let mid = msg['streams'][i]['mid'];
            self.subStreams[mid] = msg['streams'][i];
            let feed = self.feedStreams[msg['streams'][i]['feed_id']];
            if (feed && feed.slot) {
              self.slots[mid] = feed.slot;
              mids[feed.slot] = mid;
            }
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
              let body = { request: 'start', room: self.room };
              self.remoteFeed.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              windows.Janus.error('WebRTC error:', error);
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
        let sub = self.subStreams[mid];
        let feed = self.feedStreams[sub.feed_id];
        window.Janus.debug(' >> This track is coming from feed ' + sub.feed_id + ':', feed);
        let slot = self.slots[mid];
        if (feed && !slot) {
          slot = feed.slot;
          self.slots[mid] = feed.slot;
          self.mids[feed.slot] = mid;
        }
        window.Janus.debug(' >> mid ' + mid + ' is in slot ' + slot);
        if (!on) {
          delete self.remoteTracks[mid];
          delete self.slots[mid];
          delete self.mids[slot];
          return;
        }
        // If we're here, a new track was added
        if (feed.spinner) {
          feed.spinner.stop();
          feed.spinner = null;
        }

        var v;

        //
        // Get the element that is supposed to use this new track.
        //
        const e = document.getElementById(self.stringIds ? self.id : self.display);

        // Check that element exists and is an aframe element
        if (e && e.object3D) {
          const stream = new MediaStream([track]);
          self.remoteTracks[mid] = stream;

          if (track.kind === 'audio') {
            //
            // Audio track
            //
            // Attach audio to the element.
            // TODO: right now we assume audio to be positional.
            e.setAttribute('mediastream-sound', '');
            e.components['mediastream-sound'].setMediaStream(stream);
          } else {
            //
            // Attach video to the element. Will become its material's
            // texture.
            //
            var videoId = e.id + '-video';
            v = document.getElementById(videoId);
            if (!v) {
              v = document.createElement('video');
              v.autoplay = true;
              v.id = videoId;
              document.body.appendChild(v);
            }
            v.srcObject = stream;
            e.setAttribute('material', 'src', '#' + v.id);
          }

          // //
          // // Log some stream properties every second
          // //
          // if(!self.bitrateTimer[slot]) {
          //   self.bitrateTimer[slot] = setInterval(function () {
          //     // Display updated bitrate, if supported
          //     let bitrate = self.remoteFeed.getBitrate(mid);
          //     window.Janus.log('mid: ' + mid + ' bitrate: ' + bitrate);
          //     if (v) {
          //       // Check if the resolution changed too
          //       let width = v.videoWidth;
          //       let height = v.videoHeight;
          //       if (width > 0 && height > 0) {
          //         window.Janus.log('mid: ' + mid + ' resolution: ' + width+'x'+height);
          //       }
          //     }
          //   }, 1000);
          // }
        }
      },
      oncleanup: function () {
        window.Janus.log(' ::: Got a cleanup notification (remote feed) :::');
        for (let b of self.bitrateTimer) {
          clearInterval(b);
          b = null;
        }
        for (let i in self.feedStreams) {
          self.feedStreams[i].simulcastStarted = false;
          self.feedStreams[i].remoteVideos = 0;
        }
        self.remoteTracks = {};
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
                opaqueId: self.display,
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
                  let event = msg['videoroom'];
                  window.Janus.debug('Event: ' + event);
                  if(event !== undefined && event !== null) {
                    if (event === 'joined') {
                      // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                      self.id = msg['id'];
                      self.privateId = msg['private_id'];
                      window.Janus.log('Successfully joined room ' + msg['room'] + ' with ID ' + self.id);
                      self._publishOwnFeed();
                      // Any new feed to attach to?
                      if (msg['publishers']) {
                        let list = msg['publishers'];
                        window.Janus.debug('Got a list of available publishers/feeds:', list);
                        let sources = null;
                        for (let f in list) {
                          if (list[f]['dummy']) {
                            continue;
                          }
                          let id = list[f]['id'];
                          let display = list[f]['display'];
                          let streams = list[f]['streams'];
                          for (let i in streams) {
                            let stream = streams[i];
                            stream['id'] = id;
                            stream['display'] = display;
                          }
                          let slot = self.feedStreams[id] ? self.feedStreams[id].slot : null;
                          let remoteVideos = self.feedStreams[id] ? self.feedStreams[id].remoteVideos : 0;
                          self.feedStreams[id] = {
                            id: id,
                            display: display,
                            streams: streams,
                            slot: slot,
                            remoteVideos: remoteVideos
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
                    } else if (event === 'event') {
                      // Any info on our streams or a new feed to attach to?
                      if (msg['streams']) {
                        let streams = msg['streams'];
                        for (let i in streams) {
                          let stream = streams[i];
                          stream['id'] = self.id;
                          stream['display'] = self.display;
                        }
                        self.feedStreams[self.id] = {
                          id: self.id,
                          display: self.display,
                          streams: streams
                        }
                      } else if (msg['publishers']) {
                        list = msg['publishers'];
                        window.Janus.debug('Got a list of available publishers/feeds:', list);
                        let sources = null;
                        for (let f in list) {
                          if (list[f]['dummy']) {
                            continue;
                          }
                          let id = list[f]['id'];
                          let display = list[f]['display'];
                          let streams = list[f]['streams'];
                          for (let i in streams) {
                            let stream = streams[i];
                            stream["id"] = self.stringIds ? self.id : self.display;
                            stream["display"] = self.display;
                          }
                          let slot = self.feedStreams[id] ? self.feedStreams[id].slot : null;
                          let remoteVideos = self.feedStreams[id] ? self.feedStreams[id].remoteVideos : 0;
                          self.feedStreams[id] = {
                            id: id,
                            display: display,
                            streams: streams,
                            slot: slot,
                            remoteVideos: remoteVideos
                          }
                          Janus.debug('  >> [' + id + '] ' + display + ':', streams);
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
                onlocaltrack: function (track, on) {
                  //
                  // We don't really care about local tracks, as a VR
                  // clients will only send audio that we do not want
                  // to put our local audio anywhere, but we keep them
                  // anyway.
                  //
                  window.Janus.debug('Local track ' + (on ? 'added' : 'removed') + ':', track);
                  if (!on) {
                    //
                    // We are being told that our stream is off.
                    //
                    for (streamTrack of self.stream.getTracks()) {
                      if (track === streamTrack) {
                        streamTrack.stop();
                      }
                    }
                    delete self.localTracks[track.id];
                    return;
                  }
                  if (self.localTracks[track.id]) {
                    //
                    // We have seen this track already.
                    //
                    return;
                  } else if (self.stream) {
                    //
                    // New track and existing stream, add new track.
                    //
                    self.stream.addTrack(track);
                  } else {
                    //
                    // First track we see, create a new stream
                    //
                    self.stream = new MediaStream([track]);
                  }
                  //
                  // Take note of this track
                  //
                  self.localTracks[track.id] = self.stream;
                },
                onremotetrack: function (track, mid, on) {
                  // The publisher stream is sendonly, we don't expect anything here
                },
                oncleanup: function () {
                  window.Janus.log(' ::: Got a cleanup notification: we are unpublished now :::');
                  self.stream = null;
                  delete self.feedStreams[self.id];
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

//
// Local variables:
//    mode: javascript
//    js-indent-level: 2
//    indent-tabs-mode: nil
// End:
//
