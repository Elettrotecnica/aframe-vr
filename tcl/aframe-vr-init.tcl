package require json
package require json::write

# Register the websocket backend
ns_register_proc GET /aframe-vr/connect ::ws::aframevr::connect

# nsv holding the janus room information for package instances, plus
# the mutex to avoid race conditions.
nsv_set aframe-vr-janus-rooms mutex [ns_mutex create]

# Create the janus rooms for every package instance
foreach package_id [apm_package_ids_from_key -package_key aframe-vr -mounted] {
    aframe_vr::room::require -package_id $package_id
}



