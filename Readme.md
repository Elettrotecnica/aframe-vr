# OpenACS A-Frame VR

This package enables networked VR experiences on an [OpenACS](https://openacs.org/) installation.

It is based on [A-Frame](https://aframe.io/) and inspired by [Networked-Aframe](https://github.com/networked-aframe/networked-aframe).

## What is there
* Attaching an avatar to a sensor element (e.g. the camera)
* Spawining networked objects

## What is missing
* a user interface: currently, only a simple room boilerplate demo is implemented
* audio chat: this would need WebRTC...
* any kind of validation of the networked actions. This makes it currently unsuitable for "low trust" scenarios such as competitive games