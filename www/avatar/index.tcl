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
} {
    {delete_p:boolean false}
}

set user_id [ad_conn user_id]

permission::require_permission \
    -object_id [ad_conn package_id] \
    -party_id $user_id \
    -privilege write

set avatar_path avatars/${user_id}.glb
set avatar_file [acs_package_root_dir [ad_conn package_key]]/www/$avatar_path
set avatar_url [ad_conn package_url]${avatar_path}

set avatar_image_path avatars/[ad_conn user_id].png
set avatar_image_file [acs_package_root_dir [ad_conn package_key]]/www/$avatar_image_path
set avatar_image_url [ad_conn package_url]${avatar_image_path}

set delete_url [ns_conn url]?delete_p=true

if {$delete_p} {
    file delete -- $avatar_file $avatar_image_file
    ad_returnredirect [ns_conn url]
    ad_script_abort
}

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
        if {![regexp {^(https://models.readyplayer.me/)(\w+)\.glb(\?.*)?$} \
                  $avatar_api_url _ api_url avatar_id settings]} {
            ::template::element set_error avatar avatar_api_url "Invalid URL"
	    break
        }

	set avatar_api_url ${api_url}${avatar_id}.glb

        #
        # Request the avatar's glb model.
        #
	try {
	    set response [util::http::get \
                              -spool \
			      -url $avatar_api_url?useHands=false]
	    set status [dict get $response status]
	} on error {errmsg} {
	    ad_log warning $errmsg
	    set status 0
	}

        if {$status != 200} {
            ::template::element set_error avatar avatar_api_url \
                "Something went wrong retrieving the avatar model"
	    break
        }

        file rename -force -- [dict get $response file] $avatar_file


        #
        # Request to generate the avatar's thumbnail.
        #
	set render_api_url ${api_url}${avatar_id}.png

	try {
	    set response [util::http::get \
                              -spool \
			      -url $render_api_url]
	    set status [dict get $response status]
	} on error {errmsg} {
	    ad_log warning $errmsg
	    set status 0
	}

        if {$status == 200} {
	    file rename -force [dict get $response file] $avatar_image_file
        } else {
            ::template::element set_error avatar avatar_api_url \
		"Something went wrong retrieving the avatar thumbnail. If avatar appearance and thumbnail do not correspond, please try again."
	    break
        }

    }

set avatar_image_exists_p [ad_file exists $avatar_image_file]
set avatar_exists_p [ad_file exists $avatar_file]
