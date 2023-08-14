ad_page_contract {

    This page encases the VR environment into the settings UI.

}

::permission::require_permission \
    -object_id [ad_conn package_id] \
    -privilege write

set environment [parameter::get -parameter environment -default default]
set room_url environments/${environment}

set janus_url [parameter::get -parameter janus_url -default ""]
if {$janus_url ne ""} {
    try {
        aframe_vr::room::require
    } on error {errmsg} {
        ns_log warning $errmsg
        set janus_url ""
    }
}

set webrtc_p [expr {$janus_url ne ""}]
