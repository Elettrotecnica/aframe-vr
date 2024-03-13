ad_library {

    Room procs

}

namespace eval aframe_vr {}
namespace eval aframe_vr::room {}

ad_proc -private aframe_vr::room::require {
    -package_id
    {-publishers 200}
    {-force:boolean false}
} {
    Requires the Janus videoroom for specified package.

    @param force when specified, will force the room to be destroyed
                 and recreated if it already exists.
} {
    if {![info exists package_id]} {
        set package_id [ad_conn package_id]
    }
    #
    # Check if room exists in the nsd
    #
    if {![nsv_get aframe-vr-janus-rooms $package_id janus_room]} {
        #
        # We have to create the room. Lock this operations so that
        # other threads don't get in the way.
        #
        ns_mutex eval [nsv_get aframe-vr-janus-rooms mutex] {
            #
            # Before we start the room creation, try again the nsv in
            # case we are one of those threads that were blocked
            # before.
            #
            if {[nsv_get aframe-vr-janus-rooms $package_id janus_room]} {
                return $janus_room
            }

            #
            # If we are here we were the first to try and create this
            # room. Proceed.
            #
            set janus_room [parameter::get \
                                -package_id $package_id \
                                -parameter janus_room \
                                -default $package_id]

            set session_url [::janus::create_session -package_id $package_id]
            if {$session_url eq ""} {
                #
                # No Janus backend URL found. Skip this room.
                #
                return
            }

            set plugin_url [::janus::plugin::attach \
                                -session_url $session_url \
                                -plugin janus.plugin.videoroom]

            set room_exists_p [::janus::videoroom::exists_p \
                                   -plugin_url $plugin_url \
                                   -room $janus_room]

            if {$room_exists_p && $force_p} {
                ::janus::videoroom::destroy \
                    -plugin_url $plugin_url \
                    -room $janus_room
            }

            if {$force_p || !$room_exists_p} {
                set permanent_p [parameter::get \
                                     -package_id $package_id \
                                     -parameter janus_room_permanent_p \
                                     -boolean \
                                     -default false]

                set janus_room_pin [expr {int(rand() * 10000)}]
                set janus_room [::janus::videoroom::create \
                                    -permanent $permanent_p \
                                    -plugin_url $plugin_url \
                                    -room $janus_room \
                                    -description "AFrame VR room for package $package_id" \
                                    -pin $janus_room_pin \
                                    -publishers $publishers]
                parameter::set_value \
                    -package_id $package_id \
                    -parameter janus_room \
                    -value $janus_room
                parameter::set_value \
                    -package_id $package_id \
                    -parameter janus_room_pin \
                    -value $janus_room_pin
            }

            #
            # Success! Save the room in the nsv.
            #
            nsv_set aframe-vr-janus-rooms $package_id $janus_room
        }
    }

    return $janus_room
}
