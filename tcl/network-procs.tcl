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

        #
        # Send every object in the room to the newly connected client
        # so that they can populate it.
        #
        foreach {id status} [nsv_array get vrchat-${chat}] {
            dom parse -json $status s
            [$s selectNodes /type/text()] nodeValue create
            set ownerNode [$s selectNodes /owner]
            $s removeChild $ownerNode
            ::ws::send $channel [ns_connchan wsencode -opcode text [$s asJSON]]
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
        dom parse -json $msg m
        set id [[$m selectNodes /id/text()] nodeValue]
        set op [[$m selectNodes /type/text()] nodeValue]

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

                #
                # Fetch the object's status from the nsv
                #
                if {![nsv_get vrchat-${chat} ${id} status]} {
                    set status "{\"owner\": \"$channel\", \"type\": \"create\"}"
                }

                dom parse -json $status s

                set ownerNode [$s selectNodes /owner]
                set ownerText [$s selectNodes /owner/text()]
                set owner [$ownerText nodeValue]

                set opNode [$s selectNodes /type/text()]

                if {$op ne "release" &&
                    $owner ne $channel &&
                    [::ws::send $owner ""]
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
                    ns_log debug "vrchat-${chat} $id: this object belongs to" $owner "$channel will release it."
                    $s removeChild $ownerNode
                    $opNode nodeValue "release"
                    ::ws::send $channel \
                        [ns_connchan wsencode -opcode text [$s asJSON]]
                    return
                }

                if {$op eq "grab"} {
                    #
                    # We try to transfer ownership of this object to
                    # somebody else.
                    #

                    #
                    # Compute the message.
                    #
                    $s removeChild $ownerNode
                    $opNode nodeValue "grab"
                    set msg [ns_connchan wsencode -opcode text [$s asJSON]]

                    #
                    # We pick the first subscriber that is not us.
                    #
                    set transferred_p false
                    foreach c [::ws::subscribers $chat] {
                        if {$c ne $channel && [::ws::send $c $msg]} {
                            $ownerText nodeValue $c
                            $s appendChild $ownerNode
                            nsv_set vrchat-${chat} $id [$s asJSON]
                            set transferred_p true
                            break
                        }
                    }

                    if {$transferred_p} {
                        #
                        # Inform the peer they may now release the
                        # object.
                        #
                        $s removeChild $ownerNode
                        $opNode nodeValue "release"
                        ::ws::send $channel [ns_connchan wsencode -opcode text [$s asJSON]]
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
                    if {$owner ne $channel} {
                        ::ws::send $owner \
                            [ns_connchan wsencode -opcode text $msg]
                    }

                    #
                    # Save the new owner
                    #
                    $ownerText nodeValue $channel
                    nsv_set vrchat-${chat} $id [$s asJSON]

                    #
                    # Inform the peer they may now take the object.
                    #
                    $s removeChild $ownerNode
                    $opNode nodeValue "grab"
                    ::ws::send $channel \
                        [ns_connchan wsencode -opcode text [$s asJSON]]
                    return
                }

                #
                # From here on, we assume we are either the rightful
                # owners of this object, or that the previous owner
                # has left.
                #
                $ownerText nodeValue $channel
                ns_log debug "vrchat-${chat} $id: after" $msg "this object belongs to" $channel

                #
                # Update the server-side state of the object.
                #
                foreach n [$m childNodes] {
                    set nodeName [$n nodeName]
                    set e [$s selectNodes /$nodeName]
                    if {$e eq ""} {
                        $s appendChild $n
                    } else {
                        $s replaceChild $n $e
                    }
                }
                set status [$s asJSON]
                nsv_set vrchat-${chat} $id $status
                ns_log debug "vrchat-${chat} $id: persisting updated status" $status

                if {$op eq "create"} {
                    #
                    # Reply back to the peer that their object was
                    # created.
                    #
                    ::ws::send $channel [ns_connchan wsencode \
                                             -opcode text \
                                             "{\"id\": \"$id\", \"type\": \"created\"}" \
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

