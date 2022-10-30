ad_page_contract {

    Main Menu

}

set write_p [permission::permission_p \
                 -object_id [ad_conn package_id] \
                 -privilege write]

set admin_p [permission::permission_p \
                 -object_id [ad_conn package_id] \
                 -privilege admin]

set settings_url /shared/parameters?package_id=[ad_conn package_id]&return_url=[ad_return_url]

set environment [parameter::get -parameter environment -default default]
set room_url environments/${environment}

set surfaces [::aframe_vr::environment::get_streaming_surfaces $environment]
if {[llength $surfaces] != 0} {
    set stream_url streaming/
}


set avatar_url avatar/
