ad_page_contract {

    This page encases the VR environment into the settings UI.

}

::permission::require_permission \
    -object_id [ad_conn package_id] \
    -privilege write

set environment [parameter::get -parameter environment -default default]
set room_url environments/${environment}

set webrtc_p [expr {[parameter::get -parameter janus_url -default ""] ne ""}]