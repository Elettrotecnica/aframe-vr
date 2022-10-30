ad_library {

    Utilities about VR environments

}

namespace eval aframe_vr {}
namespace eval aframe_vr::environment {}

ad_proc -private aframe_vr::environment::get_streaming_surfaces {
    environment
} {
    @return a list of streaming surfaces advertised by the
            environment's manifest file.
} {
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

    return $surfaces
}
