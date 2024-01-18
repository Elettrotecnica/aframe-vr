ad_library {

    Utilities about VR environments

}

namespace eval aframe_vr {}
namespace eval aframe_vr::environment {}

ad_proc -private aframe_vr::environment::read_manifest {
    environment
} {
    @return the manifest data as dict
} {
    set environment_manifest_file [acs_package_root_dir \
                                       aframe-vr]/environments/${environment}/manifest.json

    if {[ad_file exists $environment_manifest_file]} {
        if {[namespace which ::json::json2dict] eq ""} {
	    package require json
	}

        set rfd [open $environment_manifest_file r]
        set json [read $rfd]
        close $rfd

        try {
            return [::json::json2dict $json]
        } on error {errmsg} {
            ad_log error "Invalid JSON manifest\n\n$json\n\n$errmsg"
        }
    }

    return {}
}

ad_proc -private aframe_vr::environment::get_streaming_surfaces {
    environment
} {
    @return a list of streaming surfaces advertised by the
            environment's manifest file.
} {
    set manifest [aframe_vr::environment::read_manifest $environment]
    return [dict get $manifest surfaces]
}
