ad_page_contract {

    Spawn models UI

} {
    orderby:token,optional
}

set fs_node_id [::site_node::get_children \
                       -package_key file-storage \
                       -element node_id \
                       -node_id [ad_conn node_id]]
if {$fs_node_id eq ""} {
    ad_return_complaint 1 "File-Storage non enabled"
    ad_script_abort
}

set fs_node [site_node::get -node_id $fs_node_id]
set fs_package_id [dict get $fs_node object_id]
set folder_id [::fs::get_root_folder -package_id $fs_package_id]
set fs_url [site_node::get_url -node_id $fs_node_id]
set like_filesystem_p [parameter::get -parameter BehaveLikeFilesystemP -package_id $fs_package_id -default 1]

set actions [list]

set elements {
    spawn_link {
        label ""
        link_url_col spawn_url
	display_template "Spawn"
        link_html { title "Spawn" class spawn }
    }
    name {
        label #file-storage.Name#
    }
    content_size_pretty {
        label #file-storage.Size#
        display_template {@models.content_size_pretty;noquote@}
    }
    last_modified_pretty {
        label #file-storage.Last_Modified#
    }
    download_link {
        label ""
        link_url_col download_url
	display_template "#file-storage.Download#"
        link_html { title "#file-storage.Download#" }
    }
    delete_link {
        label ""
        link_url_col delete_url
	display_template "#file-storage.Delete#"
        link_html { title "#file-storage.Delete#" }
    }
}

template::list::create \
    -name models \
    -multirow models \
    -actions $actions \
    -elements $elements \
    -orderby {
        default_value "name,asc"
        name {
            orderby_desc {fs_objects.sort_key desc, fs_objects.name desc}
            orderby_asc {fs_objects.sort_key asc, fs_objects.name asc}
        }
        content_size_pretty {
            orderby_desc {content_size desc}
            orderby_asc {content_size asc}
        }
        last_modified_pretty {
            orderby_desc {last_modified_ansi desc}
            orderby_asc {last_modified_ansi asc}
        }
    }

set return_url [ad_return_url]

set user_id [ad_conn user_id]

db_multirow -extend {
    last_modified_pretty
    content_size_pretty
    download_url
    delete_url
    spawn_url
} models select_folder_contents [subst {
      select fs_objects.name,
             fs_objects.object_id,
             fs_objects.title,
             fs_objects.file_upload_name,
             to_char(fs_objects.last_modified, 'YYYY-MM-DD HH24:MI:SS') as last_modified_ansi,
             fs_objects.content_size
      from fs_objects
      where fs_objects.object_id in (
        select distinct(orig_object_id) from acs_permission.permission_p_recursive_array(array(
	    select object_id from fs_objects
	     where parent_id = :folder_id
	       and file_upload_name like '%.glb'										       
          ), :user_id, 'read')
        )
    [template::list::orderby_clause -name models -orderby]
}] {
    set last_modified_ansi [lc_time_system_to_conn $last_modified_ansi]
    set last_modified_pretty [lc_time_fmt $last_modified_ansi "%x %X"]

    set content_size_pretty [lc_content_size_pretty -size $content_size]

    set download_link [_ file-storage.Download]
    if {$like_filesystem_p} {
	set download_url /file/$object_id/[ad_urlencode_path $title][ad_file extension $name]
    } else {
	set download_url /file/$object_id/[ad_urlencode_path $name]
    }

    set spawn_url spawn?object_id=$object_id

    set delete_url [export_vars -base ${fs_url}delete {object_id return_url {confirm_p 1}}]
}
