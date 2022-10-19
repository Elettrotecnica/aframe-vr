ad_include_contract {

    Renders the rig setup for our own presence.

}

set user_id [ad_conn user_id]

set username [person::name -person_id $user_id]

set janus_url [parameter::get -parameter janus_url -default ""]
if {$janus_url eq ""} {
    if {[security::secure_conn_p]} {
        set janus_url https://localhost:8089/janus
    } else {
        set janus_url http://localhost:8088/janus
    }
}

set janus_room [parameter::get -parameter janus_room -default 1234]



