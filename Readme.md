# OpenACS A-Frame VR
![aframe-vr-screenshot](https://github.com/Elettrotecnica/aframe-vr/assets/3331940/234670fe-c79f-4515-bd2a-782c8bd3ce04)


This package enables networked VR experiences on an
[OpenACS](https://openacs.org/) installation. It is somewhat similar
to [Mozilla Hubs](https://hubs.mozilla.com/) in spirit, based on
[A-Frame](https://aframe.io/) and inspired by
[Networked-Aframe](https://github.com/networked-aframe/networked-aframe).

## Why implementing a worse Mozilla Hubs?
Hubs is great and mature, but also quite complex. The process to host
an own installation [is not
straightforward](https://github.com/mozilla/hubs-cloud/tree/master/community-edition)
because it depends on many tools and subsystems.

To make matters more complicated, in February 2024 Mozilla has
[discontinued new development on the
product](https://hubs.mozilla.com/labs/sunset/), just a few months
after embarking in a [complete rewrite of the client
code](https://hubs.mozilla.com/labs/the-new-hubs-client/).

Although there is overlapping both in terms of features and technology
with Hubs, the focus of this implementation is on keeping it simple:
NaviServer does the Websocket stuff needed to move things around on
the scene and Janus does the WebRTC stuff for multimedia. This VR you
can definitely host on premise! ;-)

## Main features

### ReadyPlayerMe half-body avatar support

Users can create their avatar via the user interface provided by
[ReadyPlayerMe](https://vr.readyplayer.me/). Currently, half-body
avatars without hands are supported.

Once your half-body avatar is ready, you can copy/paste the generated
link in the user interface available under "Manage Avatar" on the main
package page.

The system will take care of downloading the right model without hands
and will also generate a thumbnail for you using the ReadyPlayerMe
API.

### Virtual hands via VR controllers

The hands are currently represented for every users the same using the
default models provided by A-Frame's hand-controls component.

We track position, rotation and gestures of your hands so you can
interact with your buddies.

### In-VR menu

Powered by
[aframe-htmlmesh](https://github.com/AdaRoseCannon/aframe-htmlmesh),
this menu works both in VR and on desktop. Depending on the features
enabled in your experience, it allows to check information, spawn
objects, enter/exit immersive mode and much more.

### Teleport controls

When using a headset,
[blink-controls](https://github.com/jure/aframe-blink-controls) allow
to move around without walking.

This component also supports navmeshes.

### Audio chat and WebRTC multimedia

When a properly configured [janus-gateway and multistream videoroom
plugin](https://janus.conf.meetecho.com/mvideoroomtest.html) is
available, we can provide audio chat to converse with other
participants.

Some environments will also expose surfaces that can be used to stream
content (e.g. a cinema screen). Any media one can stream via WebRTC
can be streamed on these surfaces via the "Stream to Room"
functionality on the main package page.

In the VR menu, we provide the UI to mute/unmute, check our own volume
and enable push-to-talk.

### Shared interactive networked entities with physics
![Schermata del 2024-04-12 17-02-49](https://github.com/Elettrotecnica/aframe-vr/assets/3331940/24a56dad-7efd-4e54-a312-7e54f4b53342)

Depending on your client (headset or desktop), you will be able to
interact with entities in the room together with your friends.

You will be able to:
* upload custom .glb/.gltf models
* spawn of .glb/.gltf models via UI in the networked experience
* grab objects
* increase/decrease the scale of objects, either via moving the
  thumbstick on the hand that is grabbing the item, or by grabbing
  with two hands and extending/reducing the distance between the two
  hands.

When the environment is configured accordingly, the objects will also
behave according to physics, e.g. will fall on the floor, slide down
ramps, bump against walls and so on.

### Integrated chat

When the OpenACS chat package is available, a chat will be displayed
in the menu allowing users to converse with each other, by specifying
a chat room id in the configuration parameters of your VR experience.

When using a headset is currently only possible to reply to the chat
while outside of immersive mode.

### In-VR collaborative painting
![Schermata del 2024-04-12 16-59-29](https://github.com/Elettrotecnica/aframe-vr/assets/3331940/532dbafe-be08-4b90-ba70-2731a43bf50b)

Based on a fork of the excellent
[A-Painter](https://github.com/aframevr/a-painter), we allow peers to
paint collaboratively in the experience. This can be used for art or
as a communication tool.

### Environments

The package provides common features and boilerplate for different VR
use cases such as videoconference, casual chat and lectures. The
actual looks of the space where your experience will take place is
defined by the "environments".

We currently provide 3 environments out of the box:
1. default - A simple vaporwave space with a couple of cinema
             screens. A simple flat sufface that can potentially
             accomodate larger groups.
2. ada-venue - A model taken from the excellent
               [aframe-xr-boilerplate](https://github.com/AdaRoseCannon/aframe-xr-boilerplate/). This
               environment showcases a physics-enabled building with
               uneven multi-level floor and a navmesh. It comes with a
               ball that will roll around and can be picked and played
               with by participants. Models spawned in this
               environment will also be subjected to gravity. A cinema
               screen is available.
3. cuddillero-diorama - From the famous Cudillero Diorama model on
                        MozillaHubs, this model has a complex navmesh
                        and uses multiple spatial audio sources to
                        recreate that vacation feeling.

These examples can also be used as a reference to provide new ones.

## Future (?) improvements
* better avatar integration (use native model hands, support full body
  avatars, follow sound with eyes...)
* "application based" server-side validation of the networked
  actions. This makes it currently unsuitable for "low trust"
  scenarios such as competitive games
* jumping?
* ...

## Installation

### Install OpenACS
To have OpenACS running on your machine, follow the instructions at
https://openacs.org/xowiki/naviserver-openacs

### Install the package

In your OpenACS packages folder:
```
cd /<your-openacs-path>/packages/
git clone https://github.com/Elettrotecnica/aframe-vr.git
```

Then on a browser:
1. Go to the homepage of your server
2. Log in as administrator
3. Click on "Install more packages"
4. In the section "Install from Local File System", click on Install
5. Select aframe-vr for installation
6. In the next page, click on "Install packages"
7. Restart your instance

The package can be instantiated multiple times. Each instance carries
its own parameters and configuration, so it is possible to host
different kinds of experiences and to target different user groups.

### (Optional) Install Janus

In order to support streaming multimedia content to the VR experience
and audio chat among peers, we integrate with [Janus WebRTC
Server](https://janus.conf.meetecho.com/).

Follow the intructions at https://github.com/meetecho/janus-gateway
and ensure that the (multistream) [VideoRoom
plugin](https://janus.conf.meetecho.com/docs/videoroom.html) is
enabled.

aframe-vr will automatically require a Janus video room for every
mounted package instance that is configured to utilize WebRTC. The
room can also be configured in advance in case we do not want or
cannot create rooms dynamically. See the "Room Settings" page of any
package instance and refer to the code in
[janus-videoroom-procs.tcl](https://github.com/Elettrotecnica/aframe-vr/blob/main/tcl/janus-videoroom-procs.tcl)
and
[room-procs.tcl](https://github.com/Elettrotecnica/aframe-vr/blob/main/tcl/room-procs.tcl)
for more information.

