ad_page_contract {

    This UI allows to stream either webcam or desktop to one of the
    surfaces in the VR room.

} {
    {user_media_id ""}
    {display_media_id ""}
}

permission::require_permission \
    -object_id [ad_conn package_id] \
    -privilege write

set environment [parameter::get -parameter environment -default default]
set environment_manifest_file [acs_package_root_dir [ad_conn package_key]]/www/environments/${environment}/manifest.json

if {[ad_file exists $environment_manifest_file]} {
    if {[namespace which ::json::json2dict] eq ""} {
        package require json
    }

    set rfd [open $environment_manifest_file r]
    set json [read $rfd]
    close $rfd

    try {
        set manifest [::json::json2dict $json]
        set surfaces [dict get $manifest surfaces]
    } on error {errmsg} {
        ad_log error "Invalid JSON manifest\n\n$json\n\n$errmsg"
        set surfaces [list]
    }
} else {
    set surfaces [list]
}

::template::multirow create available_surfaces name title audio video audio_video
::template::multirow append available_surfaces \
    "" " - None - " false false
foreach s $surfaces {
    set audio [dict get $s audio]
    set video [dict get $s video]
    set audio_video [list]
    if {$audio} {
        lappend audio_video AUDIO
    }
    if {$video} {
        lappend audio_video VIDEO
    }
    set audio_video ([join $audio_video /])
    ::template::multirow append available_surfaces \
        [dict get $s name] [dict get $s title] $audio $video $audio_video
}

set janus_url [parameter::get -parameter janus_url -default ""]
if {$janus_url eq ""} {
    if {[security::secure_conn_p]} {
        set janus_url https://localhost:8089/janus
    } else {
        set janus_url http://localhost:8088/janus
    }
}

set janus_room [parameter::get -parameter janus_room -default 1234]
set janus_room_pin [parameter::get -parameter janus_room_pin -default ""]

template::head::add_javascript \
    -src https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/8.1.1/adapter.min.js
template::head::add_javascript \
    -src [ad_conn package_url]/js/janus.js
template::head::add_javascript \
    -src index.js
