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
# See if the file-storage is available so spawn objects.
#
set fs_node_id [::site_node::get_children \
                       -package_key file-storage \
                       -element node_id \
                       -node_id [ad_conn node_id]]
set spawn_objects_p [expr {$fs_node_id ne ""}]
set spawn_max_size [::parameter::get -package_id $package_id -parameter spawn_max_size]
set spawn_min_size [::parameter::get -package_id $package_id -parameter spawn_min_size]

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
set environment [parameter::get -parameter environment -default default]

#
# Websocket
#
set url [ns_parseurl [ad_conn location]]
set proto [expr {[dict get $url proto] eq "http" ? "ws" : "wss"}]
set host [dict get $url host]
set port [dict get $url port]
set ws_host $host[expr {$port ne "" ? ":$port" : ""}]
set ws_uri ${proto}://${ws_host}/aframe-vr/connect/$package_id

#
# WebRTC
#
set janus_url [parameter::get -parameter janus_url -default ""]
if {$janus_url ne ""} {
    try {
        aframe_vr::room::require
    } on error {errmsg} {
        ns_log warning $errmsg
        set janus_url ""
    }
}

set janus_room [parameter::get -parameter janus_room]
set janus_room_pin [parameter::get -parameter janus_room_pin]

set webrtc_p [expr {$janus_url ne ""}]
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

::template::head::add_javascript -src "https://aframe.io/releases/1.4.2/aframe.min.js" -order 0
::template::head::add_javascript -src "/resources/aframe-vr/js/downstream-components.js" -order 1
::template::head::add_javascript -src "https://cdn.jsdelivr.net/npm/aframe-blink-controls@0.4.3/src/index.min.js" -order 2
::template::head::add_javascript -src "/resources/aframe-vr/js/simple-navmesh-constraint.js" -order 3
::template::head::add_javascript -src "/resources/aframe-vr/js/aframe-html.min.js" -order 3

::template::head::add_css -href "/resources/aframe-vr/css/w3.css" -order 1

#
# CSP Rules
#

security::csp::require connect-src $ws_host
if {[info exists webrtc_host]} {
    security::csp::require connect-src $webrtc_host
}
security::csp::require script-src aframe.io
security::csp::require img-src cdn.aframe.io
security::csp::require connect-src cdn.aframe.io
security::csp::require script-src cdn.jsdelivr.net
security::csp::require script-src cdnjs.cloudflare.com

security::csp::require script-src 'unsafe-eval'
security::csp::require -force script-src 'unsafe-inline'
security::csp::require img-src data:
security::csp::require connect-src data:
security::csp::require connect-src blob:
