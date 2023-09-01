ad_include_contract {

    This script fetches all of the avatar templates that should have
    access to this package.

}

set user_id [ad_conn user_id]
set package_id [ad_conn package_id]
set package_key [apm_package_key_from_id $package_id]

set avatar_path avatars/${user_id}.glb
set avatar_p [ad_file exists [acs_package_root_dir $package_key]/www/${avatar_path}]
set avatar_url [ad_conn package_url]${avatar_path}
