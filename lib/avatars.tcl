ad_include_contract {

    This script fetches all of the avatar templates that should have
    access to this package.

}

set user_id [ad_conn user_id]
set package_id [ad_conn package_id]
set package_key [apm_package_key_from_id $package_id]

db_multirow -unclobber -extend {
    avatar_p
    avatar_url
} user_data get_user_data {
    select user_id from users,
           acs_permission.parties_with_object_privilege(:package_id, 'write') p
    where user_id = p.party_id
} {
    set avatar_path avatars/${user_id}.glb
    set avatar_p [ad_file exists [acs_package_root_dir $package_key]/www/${avatar_path}]
    set avatar_url [ad_conn package_url]${avatar_path}
}
