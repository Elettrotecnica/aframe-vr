ad_include_contract {

    Renders the rig setup for our own presence.

}

set user_id [ad_conn user_id]

set username [person::name -person_id $user_id]

set janus_url [parameter::get -parameter janus_url -default ""]
if {$janus_url eq ""} {
    ns_log notice "Aframe VR instance [ad_conn package_id]:" \
        "Janus server not configured. This room will not use WebRTC features."
} else {
    try {
        aframe_vr::room::require
    } on error {errmsg} {
        ns_log warning $errmsg
        set janus_url ""
    }
}


set environment [parameter::get -parameter environment -default default]
set room_url environments/${environment}

if {![regexp "^.*/$room_url/?\$" [ns_conn url]]} {
    ad_log warning "Access to invalid environment detected."
    ad_returnredirect [ad_conn package_url]$room_url
    ad_script_abort
}


set janus_room [parameter::get -parameter janus_room]
set janus_room_pin [parameter::get -parameter janus_room_pin]



