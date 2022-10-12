ad_library {
    Network backend for VR chat
}

namespace eval ws::aframevr {
    #
    # The proc "connect" is called, whenever a new websocket is
    # established.  The chat is named via the url to allow multiple
    # independent chats on different urls.
    #
    nsf::proc connect {} {
        set chat [ns_conn url]
	set channel [ws::handshake -callback [list ws::aframevr::send_to_all -chat $chat]]
	ws::subscribe $channel $chat

        ::ws::aframevr::send_objects \
            -chat $chat -channel $channel
    }

    nsf::proc send_objects {
        -chat
        -channel
    } {
        #
        # Serialize every object in the room and send them to the
        # newly connected client so that they can populate the room.
        #
        foreach id [nsv_array names vrchat-${chat}] {
            set data [nsv_get vrchat-${chat} $id]
            dict set data type create
            set json [::json::write object {*}[dict map {k v} $data {
                set v [::json::write string $v]
            }]]
            ::ws::send $channel [ns_connchan wsencode -opcode text $json]
        }
    }

    #
    # Whenever we receive a message, send it to all subscribers of the
    # chat, except the current one.
    #
    nsf::proc send_to_all {
        {-chat "chat"}
        channel msg
    } {
        if {$msg eq "ping"} {
            ns_log notice "websocket '$chat', channel '$channel': ping received."
            return
        }
        # ns_log warning "Received $msg"

        try {
            # Parse the message
            set m [::json::json2dict $msg]
            set id [dict get $m id]

            if {[dict get $m type] eq "delete"} {
                # Destroy object info
                nsv_unset -nocomplain -- vrchat-${chat} $id
            } else {
                # Make sure nsv exists
                nsv_array set vrchat-${chat} {}

                if {![nsv_get vrchat-${chat} ${id} status]} {
                    set status [list]
                }
                # Take note of all the relevant object status
                # information and store it so that it can be provided
                # to clients connecting in the future
                nsv_set vrchat-${chat} $id [dict merge $status $m]
                #ns_log warning "persisting $m from $msg"
            }

        } on error {errmsg} {
            ns_log error "Parsing of $msg failed: $errmsg"
        }

        set exclude [list $channel]
        #set exclude [list]
        ::ws::multicast -exclude $exclude $chat [ns_connchan wsencode -opcode text $msg]
    }
}

#
# Local variables:
#    mode: tcl
#    tcl-indent-level: 4
#    indent-tabs-mode: nil
# End:

