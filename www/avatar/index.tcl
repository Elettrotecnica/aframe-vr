ad_page_contract {

    A User Interface to fetch and store my own avatar.

    The Avatar will be requested from ReadyPlayerMe and will be a
    half-body avatar without hands (because the hands we are going to
    provide via the Aframe hands-control component).

    After the avatar is successfully downloaded, we will also request
    a thumbnail picture from the rendering webservice by
    ReadyPlayerMe. This will be used to display a preview of our
    avatar.

    It is currently possible to generate an avatar only for our own
    user.
}

set avatar_path avatars/[ad_conn user_id].glb
set avatar_file [acs_package_root_dir [ad_conn package_key]]/www/$avatar_path
set avatar_exists_p [ad_file exists $avatar_file]
set avatar_url [ad_conn package_url]${avatar_path}

set avatar_image_path avatars/[ad_conn user_id].png
set avatar_image_file [acs_package_root_dir [ad_conn package_key]]/www/$avatar_image_path
set avatar_image_exists_p [ad_file exists $avatar_image_file]
set avatar_image_url [ad_conn package_url]${avatar_image_path}

ad_form \
    -name avatar \
    -form {
        {avatar_api_url:text
            {label "Avatar URL"}
        }
    } \
    -on_submit {
        #
        # Make sure the URL is correct.
        #
        if {![regexp {^(https://api.readyplayer.me/v1/avatars/\w+\.glb)(\?.*)?$} \
                  $avatar_api_url _ avatar_api_url settings]} {
            ::template::element set_error avatar avatar_api_url "Invalid URL"
        }

        set avatar_api_url $avatar_api_url

        #
        # Request the avatar's glb model.
        #
        set tmpfile [ad_tmpnam]
        set response [ns_http run -method GET -spoolsize 0 \
                          -outputfile $tmpfile \
                          $avatar_api_url?useHands=false]

        set status [dict get $response status]
        if {$status != 200} {
            ::template::element set_error avatar avatar_url \
                "Error while contacting the ReadyPlayerMe server. Response was: $status"
        }

        if {![::template::form::is_valid avatar]} {
            break
        }

        file rename -force -- $tmpfile $avatar_file

        #
        # Request to generate the avatar's thumbnail.
        #
        set render_api_url https://render.readyplayer.me/render
        set render_api_request [subst -nocommands {
            {
                "model": "$avatar_api_url",
                "scene": "halfbody-portrait-v1"
            }
        }]
        set headers [ns_set create]
        ns_set put $headers Content-type application/json
        set response [ns_http run -method POST \
                          -headers $headers \
                          -body $render_api_request \
                          $render_api_url]

        set thumbnail_p false
        set status [dict get $response status]
        if {$status == 200} {
            try {

                #
                # We got the JSON response containing the avatar
                # thumbnail URL, parse the response, request the image
                # and store it.
                #
                if {[namespace which ::json::json2dict] eq ""} {
                    package require json
                }
                set url [lindex \
                             [dict get \
                                  [::json::json2dict [dict get $response body]] \
                                  renders] \
                             0]

                set tmpfile [ad_tmpnam]
                set response [ns_http run -method GET -spoolsize 0 \
                                  -outputfile $tmpfile \
                                  $url]
                set status [dict get $response status]
                if {$status == 200} {
                    file rename -force $tmpfile $avatar_image_file
                    set thumbnail_p true
                }

            } on error {errmsg} {
                ns_log warning "Impossible to retrieve the avatar portrait: $errmsg"
            }
        }

        if {!$thumbnail_p} {
            #
            # Something went wrong retrieving the avatar thumbnail, so
            # avatar appearance and thumbnail might not correspond
            # anymore. Delete the image.
            #
            ad_file delete $avatar_image_file
        }


    }

