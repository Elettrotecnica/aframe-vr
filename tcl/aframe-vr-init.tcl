# Register the websocket backend
ns_register_proc GET /aframe-vr/connect ::ws::aframevr::connect

# nsv holding the janus room information for package instances, plus
# the mutex to avoid race conditions.
nsv_set aframe-vr-janus-rooms mutex [ns_mutex create]

# Connection sweeper to cleanup artifacts from disconnected peers.
ad_schedule_proc -thread t -once f 60s ::ws::aframevr::sweep_connections

ad_schedule_proc -thread t -once t 1ms eval {
    # Create the janus rooms for every package instance
    foreach package_id [apm_package_ids_from_key -package_key aframe-vr -mounted] {
        try {
            aframe_vr::room::require -force -package_id $package_id
        } on error {errmsg} {
            ad_log warning \
                "Could not create Janus videoroom for package $package_id. Is the Janus server down?" \
                $errmsg
        }
    }
}




