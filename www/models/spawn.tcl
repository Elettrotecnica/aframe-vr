ad_page_contract {
    Spawn an object in the room
} {
    object_id:object_id,notnull
    {permanent:boolean false}
}

set user_id [ad_conn user_id]
set package_id [ad_conn package_id]

if {![::permission::permission_p \
          -object_id $package_id \
          -party_id $user_id \
          -privilege write]} {
    ns_return 403 text/plain "no permission"
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

db_1row get_info {
    select live_revision as revision_id, name
    from cr_items
    where item_id = :object_id
      and parent_id = :folder_id
}
set model_url [site_node::get_url -node_id $fs_node_id]/view/[ad_urlencode_path $name]

set permanent [expr {$permanent ? true : false}]

set spawn_max_size [::parameter::get -package_id $package_id -parameter spawn_max_size]
set spawn_min_size [::parameter::get -package_id $package_id -parameter spawn_min_size]

set id spawn-$revision_id
ns_return 200 text/plain [subst -nocommands {
    <template id="$id-template">
      <a-gltf-model
         id="$id"
         data-item-id="$object_id"
         data-revision-id="$revision_id"
         center
         clamp-size="maxSize: $spawn_max_size; minSize: $spawn_min_size"
         oacs-networked-entity="template: #$id-template; permanent: $permanent"
         data-spawn="theirs"
         src="url($model_url)"
         >
      </a-gltf-model>
    </template>
}]
