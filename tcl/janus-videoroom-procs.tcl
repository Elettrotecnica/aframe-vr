ad_library {
    An API to manage Janus-gateway videorooms

    See https://janus.conf.meetecho.com/docs/videoroom.html
}


namespace eval janus {}

nsf::proc janus::request {
    -url:required
    -request_dict:required
} {
    #
    # Utility to contact the Janus backend. Automatically introduces
    # and checks the transaction id and intercepts the most common
    # errors
    #
    # @param url the URL
    # @param request_dict a dict of already quoted JSON key value
    #        pairs
    #
    # @return the JSON response
    #

    if {![dict exists $request_dict transaction]} {
        set request_transaction [ad_generate_random_string]
        lappend request_dict \
            transaction [::json::write string $request_transaction]
    } else {
        set request_transaction [dict get $request_dict transaction]
    }

    set request [::json::write object {*}$request_dict]

    try {
        set r [util::http::post -url $url -body $request]
        set status [dict get $r status]
        set message [dict get $r page]
        if {$status != 200} {
            error "request failed with status $status. Response was $message"
        }
    } on error {errMsg} {
        error "Error contacting the Janus backend: $errMsg"
    }

    try {
        set message [::json::json2dict $message]

        if {![dict exists $message transaction]} {
            error "no transaction returned in the response message\n\n$message"
        }

        set transaction [dict get $message transaction]
        if {$transaction ne $request_transaction} {
            error "transaction $transaction is invalid. Our transaction was $request_transaction"
        }
    } on error {errMsg} {
        error "Error parsing the Janus response: $errMsg"
    }

    return $message
}

nsf::proc janus::create_session {
    -janus_url
} {
    #
    # Creates a Janus session handle
    #
    # @param janus_url the optional Janus backend URL, will be
    #        retrieved from the package parameter if missing.
    #
    # @return the janus session backend URL
    #

    if {![info exists janus_url]} {
        set janus_url [parameter::get_global_value \
                     -package_key aframe-vr \
                     -parameter janus_url \
                     -default ""]
        if {$janus_url eq ""} {
            regexp {(^.*):\d+$} [ad_url] match janus_url
            append janus_url :8088/janus
        }
    }

    set request_dict [list \
                          janus \"create\"]

    set message [::janus::request \
                     -url $janus_url \
                     -request_dict $request_dict]
    set session_id [dict get $message data id]

    return $janus_url/$session_id
}


namespace eval janus::plugin {}

nsf::proc janus::plugin::attach {
    -session_url
    -plugin:required
} {
    #
    # Creates a Janus plugin handle
    #
    # @param session_url the optional session_url, a new session will
    #        be created if missing.
    # @param plugin the unique plugin name
    #        (e.g. janus.plugin.videoroom).
    #
    # @return the janus plugin backend URL
    #

    if {![info exists session_url]} {
        set session_url [::janus::create_session]
    }

    set request_dict [list \
                          janus \"attach\" \
                          plugin [::json::write string $plugin]]

    set message [::janus::request \
                     -url $session_url \
                     -request_dict $request_dict]

    set plugin_handle [dict get $message data id]

    return [string trimright $session_url "/"]/$plugin_handle
}

nsf::proc janus::plugin::request {
    -url:required
    -body_dict:required
} {
    #
    # Utility to send a request to a plugin URL handling the most
    # common errors
    #
    # @param url the URL
    # @param body an already JSON quoted key value dict
    #
    # @return the JSON response from the backend
    #

    set request_dict [list \
                          janus \"message\" \
                          body [::json::write object {*}$body_dict]]

    set message [::janus::request \
                     -url $url \
                     -request_dict $request_dict]

    if {[dict exists $message plugindata data error]} {
        error "The plugin returned an error: [dict get $message plugindata data error]"
    }

    return [dict get $message plugindata data]
}


namespace eval janus::videoroom {}

nsf::proc janus::videoroom::attach {} {
    #
    # Creates a Janus videoroom plugin handle
    #
    # @return the janus plugin backend URL
    #

    return [::janus::plugin::attach -plugin janus.plugin.videoroom]
}

nsf::proc janus::videoroom::create {
    -plugin_url
    -admin_key
    -room
    -description:required
    {-is_private:boolean true}
    {-permanent:boolean false}
    -secret
    -pin
    {-require_pvtid:boolean false}
    {-publishers 6}
    {-bitrate 128000}
    {-bitrate_cap:boolean false}
    {-fir_freq 0}
    {-audiocodec "opus"}
    {-videocodec "vp8"}
    -vp9_profile
    -h264_profile
    {-opus_fec:boolean false}
    {-video_svc:boolean false}
    {-audiolevel_ext:boolean true}
    {-audiolevel_event:boolean false}
    {-audio_active_packets:integer 100}
    {-audio_level_average 25}
    {-videoorient_ext:boolean true}
    {-playoutdelay_ext:boolean true}
    {-transport_wide_cc_ext:boolean true}
    {-record:boolean false}
    -rec_dir
    {-lock_record:boolean false}
    {-notify_joining:boolean false}
    {-require_e2ee:boolean false}
} {
    #
    # Create a room on the Janus VideoRoom Plugin
    #
    # @param plugin_url the plugin handle, will be attached to a new
    #        session if missing (requires 2 HTTP requests)
    # @param admin_key admin key (if needed)
    # @param room unique room ID
    # @param description
    # @param is_private whether this room should be in the public list
    # @param secret optional password needed for manipulating
    #        (e.g. destroying) the room
    # @param pin optional password needed for joining the room
    # @param require_pvtid whether subscriptions are required to provide
    #        a valid private_id to associate with a publisher
    # @param publishers max number of concurrent senders, e.g., 6 for a
    #        video conference or 1 for a webinar
    # @param bitrate max video bitrate for senders (e.g., 128000)
    # @param bitrate_cap whether the bitrate cap should act as a hard
    #        limit to dynamic bitrate changes by publishers. If false,
    #        publishers can go beyond that.
    # @param fir_freq send a FIR to publishers every fir_freq seconds. 0 equals disable.
    # @param audiocodec opus|g722|pcmu|pcma|isac32|isac16 audio codec(s)
    #        to force on publishers, can be a comma separated list in
    #        order of preference, e.g., opus,pcmu.
    # @param videocodec vp8|vp9|h264|av1|h265 video codec(s) to force on
    #        publishers, can be a comma separated list in order of
    #        preference, e.g., vp9,vp8,h264
    # @param vp9_profile VP9-specific profile to prefer (e.g., "2" for
    #        "profile-id=2")
    # @param h264_profile H.264-specific profile to prefer (e.g.,
    #        "42e01f" for "profile-level-id=42e01f")
    # @param opus_fec whether inband FEC must be negotiated; only works for Opus
    # @param video_svc = whether SVC support must be enabled; only works for VP9
    # @param audiolevel_ext whether the ssrc-audio-level RTP extension
    #        must be negotiated/used or not for new publishers
    # @param audiolevel_event whether to emit event to other users or not
    # @param audio_active_packets number of packets with audio level, default=100, 2 seconds
    # @param audio_level_average average value of audio level, 127=muted, 0='too loud'
    # @param videoorient_ext whether the video-orientation RTP extension
    #        must be negotiated/used or not for new publishers
    # @param playoutdelay_ext whether the playout-delay RTP extension
    #        must be negotiated/used or not for new publishers
    # @param transport_wide_cc_ext whether the transport wide CC RTP extension must be
    #        negotiated/used or not for new publishers
    # @param record whether this room should be recorded
    # @param rec_dir folder where recordings should be stored, when enabled
    # @param lock_record whether recording can only be started/stopped
    #        if the secret is provided, or using the global
    #        enable_recording request
    # @param notify_joining optional, whether to notify all participants
    #        when a new participant joins the room. The Videoroom plugin
    #        by design only notifies new feeds (publishers), and
    #        enabling this may result extra notification traffic. This
    #        flag is particularly useful when enabled with require_pvtid
    #        for admin to manage listening only participants.
    # @param require_e2ee whether all participants are required to
    #        publish and subscribe using end-to-end media encryption,
    #        e.g., via Insertable Streams
    #
    # @return room
    #

    if {![info exists plugin_url]} {
        set plugin_url [::janus::videoroom::attach]
    }

    set body_dict [list \
                     request \"create\" \
                     description [::json::write string $description] \
                     permanent [expr {$permanent ? true : false}] \
                     is_private [expr {$is_private ? true : false}] \
                     require_pvtid [expr {$require_pvtid ? true : false}] \
                     publishers $publishers \
                     bitrate $bitrate \
                     bitrate_cap [expr {$bitrate_cap ? true : false}] \
                     fir_freq $fir_freq \
                     audiocodec [::json::write string $audiocodec] \
                     videocodec [::json::write string $videocodec] \
                     audiolevel_ext [expr {$audiolevel_ext ? true : false}] \
                     audiolevel_event [expr {$audiolevel_event ? true : false}] \
                     audio_active_packets $audio_active_packets \
                     audio_level_average $audio_level_average \
                     audiolevel_ext [expr {$audiolevel_ext ? true : false}] \
                     videoorient_ext [expr {$videoorient_ext ? true : false}] \
                     playoutdelay_ext [expr {$playoutdelay_ext ? true : false}] \
                     transport_wide_cc_ext [expr {$transport_wide_cc_ext ? true : false}] \
                     record [expr {$record ? true : false}] \
                     lock_record [expr {$lock_record ? true : false}] \
                     notify_joining [expr {$notify_joining ? true : false}] \
                     require_e2ee [expr {$require_e2ee ? true : false}]]

    if {[info exists room]} {
        # Room might be an integer or a string depending on confs. We
        # must use a regexp because ids are normally a number outside
        # the integer range.
        lappend body_dict \
            room [expr {[regexp {^\d+$} $room] ?
                        $room : [::json::write string $room]}]
    }
    if {[info exists secret]} {
        lappend body_dict \
            secret [::json::write string $secret]
    }
    if {[info exists pin]} {
        lappend body_dict \
            pin [::json::write string $pin]
    }
    if {[info exists vp9_profile]} {
        lappend body_dict \
            vp9_profile [::json::write string $vp9_profile]
    }
    if {[info exists h264_profile]} {
        lappend body_dict \
            h264_profile [::json::write string $h264_profile]
    }
    if {[info exists rec_dir]} {
        lappend body_dict \
            rec_dir [::json::write string $rec_dir]
    }
    if {[info exists admin_key]} {
        lappend body_dict \
            admin_key [::json::write string $admin_key]
    }


    set message [::janus::plugin::request \
                     -url $plugin_url \
                     -body_dict $body_dict]

    if {![dict exists $message room]} {
        error "No room returned in the response message\n\n$message"
    }

    if {$permanent ne [dict exists $message permanent]} {
        ns_log warning "A permanent room was requested, but a non-permanent one was returned."
    }

    return [dict get $message room]
}

nsf::proc janus::videoroom::edit {
    -plugin_url
    -room:required
    -new_description
    -new_is_private:boolean
    -new_secret
    -new_pin
    -new_require_pvtid:boolean
    -new_bitrate
    -new_fir_freq
    -new_publishers
    -new_lock_record:boolean
    {-permanent:boolean false}
} {
    #
    # Create a room on the Janus VideoRoom Plugin
    #
    # @param plugin_url the plugin handle, will be attached to a new
    #        session if missing (requires 2 HTTP requests)
    # @param room unique room ID
    # @param new_description
    # @param new_is_private whether this room should be in the public list
    # @param new_secret optional password needed for manipulating
    #        (e.g. destroying) the room
    # @param new_pin optional password needed for joining the room
    # @param new_require_pvtid whether subscriptions are required to provide
    #        a valid private_id to associate with a publisher
    # @param new_publishers max number of concurrent senders, e.g., 6 for a
    #        video conference or 1 for a webinar
    # @param new_bitrate max video bitrate for senders (e.g., 128000)
    # @param new_fir_freq send a FIR to publishers every fir_freq seconds. 0 equals disable.
    # @param new_lock_record whether recording can only be started/stopped
    # @param permanent whether changes should be persisted in the configuration file
    #

    if {![info exists plugin_url]} {
        set plugin_url [::janus::videoroom::attach]
    }

    set body_dict [list \
                       request \"edit\" \
                       room [expr {[regexp {^\d+$} $room] ?
                                   $room : [::json::write string $room]}] \
                       permanent [expr {$permanent ? true : false}]]

    if {[info exists new_description]} {
        lappend body_dict \
            new_description [::json::write string $new_description]
    }
    if {[info exists new_is_private]} {
        lappend body_dict \
            new_is_private [expr {$new_is_private ? true : false}]
    }
    if {[info exists new_require_pvtid]} {
        lappend body_dict \
            new_require_pvtid [expr {$new_require_pvtid ? true : false}]
    }
    if {[info exists new_publishers]} {
        lappend body_dict \
            new_publishers $new_publishers
    }
    if {[info exists new_bitrate]} {
        lappend body_dict \
            new_bitrate $new_bitrate
    }
    if {[info exists new_fir_freq]} {
        lappend body_dict \
            new_fir_freq $new_fir_freq
    }
    if {[info exists new_lock_record]} {
        lappend body_dict \
            new_lock_record [expr {$new_lock_record ? true : false}]
    }

    set message [::janus::plugin::request \
                     -url $plugin_url \
                     -body_dict $body_dict]

    if {$permanent ne [dict exists $message permanent]} {
        ns_log warning "A permanent room edit was requested, but a non-permanent one was returned."
    }

    return $message
}

nsf::proc janus::videoroom::exists_p {
    -plugin_url
    -room:required
} {
    #
    # Gets whether a room exists
    #
    # @param plugin_url the plugin handle, will be attached to a new
    #        session if missing (requires 2 HTTP requests)
    # @param room unique room ID
    #
    # @return boolean
    #

    if {![info exists plugin_url]} {
        set plugin_url [::janus::videoroom::attach]
    }

    set body_dict [list \
                       request \"exists\" \
                       room [expr {[regexp {^\d+$} $room] ?
                                   $room : [::json::write string $room]}]]

    set message [::janus::plugin::request \
                     -url $plugin_url \
                     -body_dict $body_dict]

    return [dict get $message exists]
}

nsf::proc janus::videoroom::destroy {
    -plugin_url
    -room:required
    -secret
    {-permanent:boolean false}
} {
    #
    # Destroy a room on the Janus VideoRoom Plugin
    #
    #
    # @param plugin_url the plugin handle, will be attached to a new
    #        session if missing (requires 2 HTTP requests)
    # @param room unique room ID
    # @param secret password (if required by room conf)
    # @permanent delete the room from the config file as well
    #

    if {![info exists plugin_url]} {
        set plugin_url [::janus::videoroom::attach]
    }

    set body_dict [list \
                     request \"destroy\" \
                     room [expr {[regexp {^\d+$} $room] ?
                                 $room : [::json::write string $room]}] \
                     permanent [expr {$permanent ? true : false}]]

    if {[info exists secret]} {
        lappend body_dict \
            secret [::json::write string $secret]
    }

    return [::janus::plugin::request \
                -url $plugin_url \
                -body_dict $body_dict]
}

nsf::proc janus::videoroom::list {
    -plugin_url
} {
    #
    # List the currently configured videorooms
    #

    if {![info exists plugin_url]} {
        set plugin_url [::janus::videoroom::attach]
    }

    set body_dict [::list \
                       request "\"list\""]

    set message [::janus::plugin::request \
                     -url $plugin_url \
                     -body_dict $body_dict]

    return [dict get $message list]
}

#
# Local variables:
#    mode: tcl
#    tcl-indent-level: 4
#    indent-tabs-mode: nil
# End:

