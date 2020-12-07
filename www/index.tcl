ad_page_contract {
    A VR room.
}

auth::require_login

set user_id [ad_conn user_id]

set username [person::name -person_id $user_id]

db_multirow -unclobber -extend {
    avatar_p
    avatar_url
} user_data get_user_data {
    select user_id from users
} {
    set avatar_path avatars/${user_id}.glb
    set avatar_p [file exists [file dirname [ad_conn file]]/${avatar_path}]
    set avatar_url [ad_conn package_url]${avatar_path}
}
