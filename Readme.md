# OpenACS A-Frame VR

This package enables networked VR experiences on an [OpenACS](https://openacs.org/) installation.

It is based on [A-Frame](https://aframe.io/) and inspired by [Networked-Aframe](https://github.com/networked-aframe/networked-aframe).

## What is there
* Attaching an avatar to a sensor element (e.g. the camera)
* hand-controls support for avatars, including gestures
* Spawning networked objects
* Clock synced animations

## What is missing
* a user interface: currently, only a simple room boilerplate demo is implemented
* audio chat: this would need WebRTC...
* any kind of validation of the networked actions. This makes it currently unsuitable for "low trust" scenarios such as competitive games

## How to use
1. Install the package on your OpenACS instance
2. Access the package index page with two different browsers or machines. Use unauthenticated users or two separate authenticated ones.

The demo will spawn a simple sphere-shaped avatar for each participant in a vaporwave space. Roam around and stare at each other! If you own a VR controller, have fun waving and pointing to your friends :-) ...or just extend the basic demo to use nicer avatars and a cooler VR environment.