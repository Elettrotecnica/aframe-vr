# OpenACS A-Frame VR

This package enables networked VR experiences on an
[OpenACS](https://openacs.org/) installation. It is somewhat similar
to [Mozilla Hubs](https://hubs.mozilla.com/) in spirit, based on
[A-Frame](https://aframe.io/) and inspired by
[Networked-Aframe](https://github.com/networked-aframe/networked-aframe).

## Why implementing a worse Mozilla Hubs?
Hubs is great, but also quite complex. It currently offers no way to
self-host it on premise and depends on many subsystems.  Here, the
focus is on keeping it simple. NaviServer does the Websocket stuff
needed to move things around on the scene and Janus does the WebRTC
stuff for multimedia. This VR you can definitely host on premise! ;-)

## Main features
* [ReadyPlayerMe](https://vr.readyplayer.me/) half-body avatar support
* virtual hands via VR controllers
* teleport controls
* audio chat and WebRTC multimedia using [janus-gateway and the multistream videoroom plugin](https://janus.conf.meetecho.com/mvideoroomtest.html)
* shared interactive networked entities, that all participants can interact with
* spawn of .glb/.gltf models via UI in the entworked experience
* integrated chat (dependent on the chat package)
* physics enabled environments
* in and out VR UI for spawning 3D models, mute/unmute microphone, enter/exit VR, chat

## Future (?) improvements
* richer model interaction (e.g. dynamical resize)
* better avatar integration (use native model hands, support full body avatars, follow sound with eyes...)
* "application based" server-side validation of the networked actions. This makes it currently unsuitable for "low trust" scenarios such as competitive games
* further hybrid participation support
* ...

## How to use
1. Install the package on your OpenACS instance
2. Access the package index page as administrator to configure your
   virtual environment. There are currently two environments to choose
   from, "default" and "ada-venue".
3. If you plan on using audio chat or to stream multimedia in your
   virtual environment, also provide the configuration to a Janus
   instance.
4. Environments will sometimes expose "surfaces" that can be used to
   publish content into the VR scene, such as videos or
   presentations. In this case, use the "Stream to Room"
   functionality.
5. Every user can set for themselves an avatar generated on the
   [ReadyPlayerMe](https://vr.readyplayer.me/) website. Currently,
   only head and half-body are supported, while hands will be the same
   for everybody.
