ad_page_contract {

    This page encases the VR environment into the settings UI.

}

set user_id [ad_conn user_id]

::permission::require_permission \
    -object_id [ad_conn package_id] \
    -party_id $user_id \
    -privilege write

set package_id [ad_conn package_id]
set package_key [apm_package_key_from_id $package_id]
set package_url [ad_conn package_url]

#
# Check if this VR experience supports the chat
#
if {[namespace which ::chat::Chat] ne "" &&
    [::parameter::get -package_id $package_id -boolean -parameter chat_p -default 0]} {
    set chat_room_id [::parameter::get -package_id $package_id -parameter chat_room_id]
} else {
    set chat_room_id ""
}
set chat_p [expr {$chat_room_id ne ""}]

#
# Check if this VR experience supports spawning objects
#
set spawn_objects_p [parameter::get -package_id $package_id -parameter spawn_objects_p -boolean -default 0]
if {$spawn_objects_p} {
    #
    # See if the file-storage is available so spawn objects.
    #
    set fs_node_id [::site_node::get_children \
			-package_key file-storage \
			-element node_id \
			-node_id [ad_conn node_id]]
    set spawn_objects_p [expr {$fs_node_id ne ""}]
    set spawn_max_size [::parameter::get -package_id $package_id -parameter spawn_max_size]
    set spawn_min_size [::parameter::get -package_id $package_id -parameter spawn_min_size]
}

#
# User info
#
set username [person::name -person_id $user_id]
set avatar_path avatars/${user_id}.glb
set avatar_p [ad_file exists [acs_package_root_dir $package_key]/www/${avatar_path}]
set avatar_url ${package_url}${avatar_path}

#
# Environment
#
set environment [parameter::get -package_id $package_id -parameter environment -default default]
set manifest [aframe_vr::environment::read_manifest $environment]
set physics_p [expr {
                     [dict exists $manifest physics] &&
                     [string is true -strict [dict get $manifest physics]]
                 }]
if {$physics_p} {
    set damping ""
} else {
    set damping "; gravity: 0 0 0; linearDamping: 1; angularDamping: 1"
}

#
# Check if this VR experience supports WebRTC
#
set webrtc_p [parameter::get -package_id $package_id -parameter webrtc_p -boolean -default 0]
if {$webrtc_p} {
    set janus_url [parameter::get -package_id $package_id -parameter janus_url -default ""]
    if {$janus_url ne ""} {
	try {
	    aframe_vr::room::require
	} on error {errmsg} {
	    ns_log warning $errmsg
	    set janus_url ""
	}
    }

    set janus_room [parameter::get -package_id $package_id -parameter janus_room]
    set janus_room_pin [parameter::get -package_id $package_id -parameter janus_room_pin]

    set webrtc_p [expr {$janus_url ne ""}]
}
if {$webrtc_p} {
    set url [ns_parseurl $janus_url]
    set host [dict get $url host]
    set port [dict get $url port]
    set webrtc_host $host[expr {$port ne "" ? ":$port" : ""}]
}

#
# Dependencies
#
::template::head::add_javascript -src "https://cdn.jsdelivr.net/npm/hls.js@latest" -order 0

if {$webrtc_p} {
    ::template::head::add_javascript -src "https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/8.1.1/adapter.min.js" -order 0
    ::template::head::add_javascript -src "/resources/aframe-vr/js/janus.js" -order 1
}

::template::head::add_javascript -src "https://cdn.jsdelivr.net/npm/aframe@1.7.0/dist/aframe-master.min.js" -order 0
::template::head::add_javascript -src "/resources/aframe-vr/js/downstream-components.js" -order 1
::template::head::add_javascript -src "https://cdn.jsdelivr.net/npm/aframe-blink-controls@0.4.3/src/index.min.js" -order 2
::template::head::add_javascript -src "/resources/aframe-vr/js/simple-navmesh-constraint.js" -order 3
::template::head::add_javascript -src "/resources/aframe-vr/js/aframe-html.min.js" -order 3
::template::head::add_javascript -src "/resources/aframe-vr/js/aframe-input-mapping-component.js" -order 3

::template::head::add_css -href "/resources/aframe-vr/css/w3.css" -order 1

if {$spawn_objects_p || $physics_p} {
    ::template::head::add_javascript -src "https://cdn.jsdelivr.net/gh/MozillaReality/ammo.js@8bbc0ea/builds/ammo.wasm.js" -order 4
    ::template::head::add_javascript -src "https://cdn.jsdelivr.net/npm/@c-frame/aframe-physics-system@4.2.3/dist/aframe-physics-system.min.js" -order 5
}


set painting_p [parameter::get -package_id $package_id -parameter painting_p -default 0]

if {$painting_p} {
    #
    # Painter
    #
    ::template::head::add_javascript \
        -src "/resources/aframe-vr/js/a-painter.js" \
        -order 4
    ::template::head::add_javascript \
        -src "https://cdn.jsdelivr.net/npm/clipboard@1.5.12/dist/clipboard.min.js" \
        -order 5
    ::template::head::add_javascript \
        -src "https://cdn.jsdelivr.net/npm/aframe-gltf-exporter-component@0.1.0/dist/aframe-gltf-exporter-component.min.js" \
        -order 5
}


###

#
# CSP Rules
#

if {[info exists webrtc_host]} {
    security::csp::require connect-src $webrtc_host
}
security::csp::require script-src aframe.io
security::csp::require img-src cdn.aframe.io
security::csp::require connect-src cdn.aframe.io
security::csp::require script-src cdn.jsdelivr.net
security::csp::require connect-src cdn.jsdelivr.net
security::csp::require script-src cdnjs.cloudflare.com

security::csp::require script-src 'unsafe-eval'
security::csp::require -force script-src 'unsafe-inline'
security::csp::require img-src data:
security::csp::require connect-src data:
security::csp::require connect-src blob:
