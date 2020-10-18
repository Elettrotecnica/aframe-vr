package require json
package require json::write

# Register the websocket backend
ns_register_proc GET /aframe-vr/connect ::ws::aframevr::connect
