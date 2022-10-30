ad_library {

    Room procs

}

namespace eval aframe_vr {}
namespace eval aframe_vr::room {}

ad_proc -private aframe_vr::room::require {
    -package_id
    {-publishers 200}
} {
    Requires the Janus videoroom for specified package
} {
    if {![info exists package_id]} {
        set package_id [ad_conn package_id]
    }
    if {![nsv_array exists aframe-vr-janus-rooms] ||
        ![nsv_get aframe-vr-janus-rooms $package_id janus_room]} {
        set janus_room [parameter::get -package_id $package_id -parameter janus_room -default $package_id]

        set session_url [::janus::create_session -package_id $package_id]
        set plugin_url [::janus::plugin::attach \
                            -session_url $session_url \
                            -plugin janus.plugin.videoroom]
        set room_exists_p [::janus::videoroom::exists_p \
                               -plugin_url $plugin_url \
                               -room $janus_room]
        if {!$room_exists_p} {
            set janus_room_pin [expr {rand() * 10000}]
            set janus_room [::janus::videoroom::create \
                                -plugin_url $plugin_url \
                                -room $janus_room \
                                -description "AFrame VR room for package $package_id" \
                                -pin $janus_room_pin \
                                -publishers $publishers]
            ns_log warning $room
            parameter::set_value \
                -package_id $package_id \
                -parameter janus_room \
                -value $janus_room
            parameter::set_value \
                -package_id $package_id \
                -parameter janus_room_pin \
                -value $janus_room_pin
        }
        nsv_set aframe-vr-janus-rooms $package_id $janus_room
    }

    return $janus_room
}
