ad_library {
    Network backend for VR chat
}

namespace eval ws::aframevr {

    nsf::proc connect {} {
        #
        # Called whenever a new websocket is established.  The chat is
        # named via the url to allow multiple independent chats on
        # different urls.
        #
        set chat [ns_conn url]
	set channel [::ws::handshake -callback [list ws::aframevr::handle_message -chat $chat]]
	ws::subscribe $channel $chat

        ::ws::aframevr::send_objects \
            -chat $chat -channel $channel
    }

    nsf::proc object_to_json {
        data
    } {
        #
        # Serialize data to JSON
        #

        #
        # The owner is an internal property that we do not want to
        # disclose.
        #
        dict unset data owner

        return [::json::write object {*}[dict map {k v} $data {
            set v [::json::write string $v]
        }]]
    }

    nsf::proc send_objects {
        -chat
        -channel
    } {
        #
        # Serialize every object in the room and send them to the
        # newly connected client so that they can populate the room.
        #
        foreach {id data} [nsv_array get vrchat-${chat}] {
            dict set data type create
            set json [::ws::aframevr::object_to_json $data]
            ::ws::send $channel [ns_connchan wsencode -opcode text $json]
        }
    }

    nsf::proc handle_message {
        {-chat "chat"}
        channel msg
    } {
        #
        # Deal with websocket messages
        #

        #
        # Client may send keepalive pings, we just log it in case.
        #
        if {$msg eq "ping"} {
            ns_log debug "websocket '$chat', channel '$channel': ping received."
            return
        }

        #
        # Parse the message
        #
        set m [::json::json2dict $msg]

        set id [dict get $m id]
        set op [dict get $m type]

        switch $op {
            "delete" {
                #
                # Destroy object info
                #
                nsv_unset -nocomplain -- vrchat-${chat} $id
            }
            default {
                #
                # Make sure nsv exists
                #
                nsv_array set vrchat-${chat} {}

                if {![nsv_get vrchat-${chat} ${id} status]} {
                    set status [list]
                }

                if {$op ne "release" &&
                    [dict exists $status owner] &&
                    [dict get $status owner] ne $channel &&
                    [::ws::send [dict get $status owner] ""]
                } {
                    #
                    # For any operation except "release", we deny
                    # acting on an existing object unless we are the
                    # owners.
                    #
                    # The peer issuing the request will be asked to
                    # release control over this object.
                    #
                    # The message will also carry the current
                    # status of the object so the client can sync
                    # it.
                    #
                    # We do not disclose the owner.
                    #
                    ns_log debug "vrchat-${chat} $id: this object belongs to" [dict get $status owner] "$channel will release it."
                    dict set status type release
                    ::ws::send $channel [ns_connchan wsencode \
                                             -opcode text \
                                             [::ws::aframevr::object_to_json $status] \
                                            ]
                    return
                }

                if {$op eq "grab"} {
                    #
                    # We try to transfer ownership of this object to
                    # somebody else.
                    #

                    #
                    # Compute the message. We do not disclose the
                    # owner.
                    #
                    set msg $status
                    dict set msg type grab
                    set msg [ns_connchan wsencode \
                                 -opcode text \
                                 [::ws::aframevr::object_to_json $msg] \
                                ]

                    #
                    # We pick the first subscriber that is not us.
                    #
                    set transferred_p false
                    foreach c [::ws::subscribers $chat] {
                        if {$c ne $channel && [::ws::send $c $msg]} {
                            dict set status owner $c
                            nsv_set vrchat-${chat} $id $status
                            set transferred_p true
                            break
                        }
                    }

                    if {$transferred_p} {
                        #
                        # Inform the peer they may now release the
                        # object.
                        #
                        dict set status type release
                        ::ws::send $channel [ns_connchan wsencode \
                                                 -opcode text \
                                                 [::ws::aframevr::object_to_json $status] \
                                                ]
                        ns_log debug "vrchat-${chat} $id: transferred object ownership to $c"
                    } else {
                        #
                        # Nobody there to give this object to. We
                        # delete the object.
                        #
                        nsv_unset -nocomplain -- vrchat-${chat} $id
                        ns_log debug "vrchat-${chat} $id: no candidates for this object. Deleting..."
                    }
                    return
                }

                if {$op eq "release"} {
                    #
                    # We want to get control over an object.
                    #

                    #
                    # Relay the message to the current owner
                    #
                    if {[dict exists $status owner] &&
                        [dict get $status owner] ne $channel} {
                        ::ws::send [dict get $status owner] \
                            [ns_connchan wsencode -opcode text $msg]
                    }

                    #
                    # Save the new owner
                    #
                    dict set status owner $channel
                    nsv_set vrchat-${chat} $id $status

                    #
                    # Inform the peer they may now take the object.
                    #
                    dict set status type grab
                    ::ws::send $channel [ns_connchan wsencode \
                                             -opcode text \
                                             [::ws::aframevr::object_to_json $status] \
                                            ]
                    return
                }

                #
                # From here on, we assume we are either the rightful
                # owners of this object, or that the previous owner
                # has left.
                #
                dict set m owner $channel
                ns_log debug "vrchat-${chat} $id: after" $msg "this object belongs to" $channel

                #
                # Update the server-side state of the object.
                #
                set status [dict merge $status $m]
                nsv_set vrchat-${chat} $id $status
                ns_log debug "vrchat-${chat} $id: persisting updated status" $status

                if {$op eq "create"} {
                    #
                    # Reply back to the peer that their object was
                    # created.
                    #
                    ::ws::send $channel [ns_connchan wsencode \
                                             -opcode text \
                                             [::ws::aframevr::object_to_json \
                                                  [list id $id type created] \
                                                 ] \
                                            ]
                }
            }
        }

        #
        # Default behavior is to broadcast the message as is to the
        # other peers.
        #
        ns_log debug "vrchat-${chat} $id: broadcasting" $msg
        ::ws::multicast -exclude [list $channel] $chat [ns_connchan wsencode -opcode text $msg]
    }
}

#
# Local variables:
#    mode: tcl
#    tcl-indent-level: 4
#    indent-tabs-mode: nil
# End:

