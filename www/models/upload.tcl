ad_page_contract {
    Spawn an object in the room
} {
    model:notnull
    model.tmpfile:tmpfile
}

if {[ad_file extension $model] ni {".glb" ".gltf"}} {
    ns_return 401 text/plain "invalid file type"
    ad_script_abort
}

# if {[exec file --mime-type $model] ne "model/gltf-binary"} {
#     ns_return 401 text/plain "invalid file type"
#     ad_script_abort
# }

set user_id [ad_conn user_id]
set package_id [ad_conn package_id]

if {![::permission::permission_p \
          -object_id $package_id \
          -party_id $user_id \
          -privilege write]} {
    ns_return 403 text/plain "No permission"
    ad_script_abort
}

set fs_node_id [::site_node::get_children \
                       -package_key file-storage \
                       -element node_id \
                       -node_id [ad_conn node_id]]
if {$fs_node_id eq ""} {
    ns_return 501 text/plain "File-Storage non enabled"
    ad_script_abort
}
set fs_node [site_node::get -node_id $fs_node_id]
set fs_package_id [dict get $fs_node object_id]
set folder_id [::fs::get_root_folder -package_id $fs_package_id]

set item_id [fs::get_item_id -name $model -folder_id $folder_id]
if {$item_id ne ""} {
    ns_return 500 text/plain "File exists"
    ad_script_abort
}

set revision_id [::fs::add_file \
		     -item_id [::fs::get_item_id -name $model -folder_id $folder_id] \
                     -name $model \
                     -parent_id $folder_id \
                     -tmp_filename ${model.tmpfile} \
                     -creation_user $user_id \
                     -creation_ip [ad_conn peeraddr] \
                     -mime_type */* \
                     -package_id $fs_package_id]

ad_returnredirect .
ad_script_abort
