
class JanusConnector {
  constructor (data) {
    this.URI = data.URI;
    this.room = data.room;
    this.pin = data.pin;

    this.debug = data.debug;
    this.debug = 'all';
    // By default, Janus videoroom plugin wants integer ids, but one
    // can set the 'string_ids' property to true in the plugin conf to
    // use strings. In such setup, one must also set 'stringIds'
    // component flag to true.
    var id = data.id;
    this.stringIds = data.stringIds;
    if (this.stringIds) {
      // With string ids I can use the display property for the human
      // readable username, which would just be ignored otherwise.
      this.id = id;
      this.display = data.name ? data.name : this.id;
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

    this.videoType = data.videoType;
    this.useAudio = data.useAudio;
    this.doSimulcast = data.doSimulcast ? true : false;
    this.subscribe = data.subscribe ? true : false;

    if (data.bitrate) {
      this.bitrate = parseInt(data.bitrate);
    }
  }

  disconnect () {
    this.janus.destroy();
  }

  setBitrate(bitrate) {
    if (bitrate === undefined) {
      bitrate = this.bitrate;
    } else {
      this.bitrate = bitrate;
    }

    // We are not ready or do not plan to control the bitrate
    if (!this.pluginHandle || bitrate === undefined) {
      return;
    }
    if (bitrate === 0) {
      window.Janus.log('Not limiting bandwidth via REMB');
    } else {
      window.Janus.log('Capping bandwidth to ' + bitrate + ' via REMB');
    }
    this.pluginHandle.send({ message: { request: 'configure', bitrate: bitrate }});
  }

  toggleMute () {
    if (this.pluginHandle) {
      if (!this.pluginHandle.isAudioMuted()) {
        window.Janus.log('Muting local stream...');
        this.pluginHandle.muteAudio();
      } else {
        window.Janus.log('Unmuting local stream...');
        this.pluginHandle.unmuteAudio();
      }
    }
  }

  _unsubscribeFrom (id) {
    // Unsubscribe from this publisher
    var feed = this.feedStreams[id];
    if (!feed) {
      return;
    }
    window.Janus.debug('Feed ' + id + ' (' + feed.display + ') has left the room, detaching');

    let optionId = this.stringIds ? feed.id : feed.display;
    // Show again options that are available again
    for (let e of document.querySelectorAll('.surfaces option[value="' + optionId + '"]')) {
      e.style.display = null;
    }

    // Hide the user from the connected peers list
    let e = document.querySelector('#users-list .' + optionId);
    if (e) {
      e.style.display = 'none';
    }

    if (this.bitrateTimer[feed.id]) {
      clearInterval(this.bitrateTimer[feed.id]);
    }
    this.bitrateTimer[feed.id] = null;
    delete this.simulcastStarted[feed.id];
    delete this.feeds[feed.id];
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
  }

  _publishOwnFeed () {
    // Publish our stream

    let tracks = [];
    if (this.useAudio) {
      tracks.push({ type: 'audio', capture: true, recv: false });
    }
    if (this.videoType) {
      tracks.push({ type: this.videoType, capture: true, recv: false, simulcast: this.doSimulcast });
    }
    if (tracks.length === 0) {
      return;
    }

    var self = this;
    this.pluginHandle.createOffer({
      tracks: tracks,
      success: function (jsep) {
        window.Janus.debug('Got publisher SDP!');
        window.Janus.debug(jsep);
        var publish = { request: 'configure', audio: this.useAudio, video: this.videoType !== null };
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
  }

  _subscribeTo (sources) {
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
              self.simulcastStarted[sub.feed_id] = true;

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

        if (!on) {
          delete self.remoteTracks[mid];
          return;
        }

        if (!feed) {
          return;
        }

        let id = this.stringIds ? feed.id : feed.display;

        // Hide options that have been taken by somebody else.
        for (let e of document.querySelectorAll('.surfaces option[value="' + id + '"]')) {
          e.style.display = on ? 'none' : null;
        }

        let e = document.querySelector('#users-list .' + id);
        if (e) {
          e.style.display = 'block';
        } else {
          e = document.createElement('div');
          e.classList.add(id);
          e.textContent = id;
          let inserted = false;
          let usersList = document.querySelector('#users-list');
          for (let s of usersList.querySelectorAll('div')) {
            if (s.className > id) {
              s.parentElement.insertBefore(e, s);
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            usersList.appendChild(e);
          }
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
          self.feedStreams[i].remoteVideos = 0;
        }
        self.remoteTracks = {};
      }
    });
  }

  connect () {
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
        self.janus = new Janus({
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
                  self.setBitrate();
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
                      if (self.subscribe && msg['publishers']) {
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
                      } else if (self.subscribe && msg['publishers']) {
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
                      } else if (self.subscribe && msg['leaving']) {
                        // One of the publishers has gone away?
                        var leaving = msg['leaving'];
                        window.Janus.log('Publisher left: ' + leaving);
                        self._unsubscribeFrom(leaving);
                      } else if (self.subscribe && msg['unpublished']) {
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
                  if (on) {
                    let stream = new window.MediaStream([track]);
                    if (track.kind === 'video') {
                      let e = document.getElementById(self.videoType);
                      e.srcObject = stream;
                      e.style.display = 'block';
                      e.play();
                    } else {
                      let canvas = document.getElementById('audio-preview');
                      canvas.width = 320;
                      canvas.height = 80;
                      let audioContext = new window.AudioContext();
                      let audioSource = audioContext.createMediaStreamSource(stream);
                      let analyser = audioContext.createAnalyser();
                      audioSource.connect(analyser);
                      analyser.fftSize = 128;
                      const bufferLength = analyser.frequencyBinCount;
                      const dataArray = new window.Uint8Array(bufferLength);
                      const barWidth = canvas.width / bufferLength;
                      const ctx = canvas.getContext("2d");
                      function animate() {
                        let x = 0;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        analyser.getByteFrequencyData(dataArray);
                        for (let i = 0; i < bufferLength; i++) {
                          let barHeight = dataArray[i];
                          ctx.fillStyle = "red";
                          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                          x += barWidth;
                        }
                        requestAnimationFrame(animate);
                      }
                      canvas.style.display = 'block';
                      animate();
                    }
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
};
