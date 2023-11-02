ad_page_contract {

    Ui to upload and manage gltf models.

    @param format when "json", the page will return a JSON formatted
                  array of the available models insread of the UI.

} {
    orderby:token,optional
    {format:oneof(|json) ""}
}

set fs_node_id [::site_node::get_children \
                       -package_key file-storage \
                       -element node_id \
                       -node_id [ad_conn node_id]]
if {$fs_node_id eq ""} {
    ad_return_complaint 1 "File-Storage non enabled"
    ad_script_abort
}

set user_id [ad_conn user_id]
set package_id [ad_conn package_id]

set write_p [::permission::permission_p \
		 -object_id $package_id \
		 -party_id $user_id \
		 -privilege write]

set fs_node [site_node::get -node_id $fs_node_id]
set fs_package_id [dict get $fs_node object_id]
set folder_id [::fs::get_root_folder -package_id $fs_package_id]

if {$write_p} {
    ad_form \
	-name upload \
	-html {
	    enctype multipart/form-data
	} \
	-form {
	    {model:file(file)
		{label {.gltf/.glb Model}}
		{html {required ""}}
	    }
	} -on_submit {

	    # if {[exec file --mime-type $model] ne "model/gltf-binary"} {
	    #    template::form::set_error upload model "Invalid file type"
	    #    break
	    # }
	    lassign $model model model.tmpfile mime_type
	    if {![string match "model/gltf*" $mime_type]} {
		template::form::set_error upload model "Invalid file type"
		break
	    }

	    set item_id [fs::get_item_id -name $model -folder_id $folder_id]
	    if {$item_id ne ""} {
		template::form::set_error upload model "File exists"
		break
	    }

	    set revision_id [::fs::add_file \
				 -item_id [::fs::get_item_id -name $model -folder_id $folder_id] \
				 -name $model \
				 -parent_id $folder_id \
				 -tmp_filename ${model.tmpfile} \
				 -creation_user $user_id \
				 -creation_ip [ad_conn peeraddr] \
				 -mime_type $mime_type \
				 -package_id $fs_package_id]
	}
}

set fs_url [site_node::get_url -node_id $fs_node_id]
set like_filesystem_p [parameter::get -parameter BehaveLikeFilesystemP -package_id $fs_package_id -default 1]

set actions [list]

set delete_p [permission::permission_p -party_id $user_id -object_id $folder_id -privilege "delete"]

set elements {
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
}

if {$delete_p} {
    append elements {
	delete_link {
	    label ""
	    link_url_col delete_url
	    display_template "#file-storage.Delete#"
	    link_html { title "#file-storage.Delete#" }
	}
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

db_multirow -extend {
    last_modified_pretty
    content_size_pretty
    download_url
    delete_url
} models select_folder_contents [subst {
      select fs_objects.name,
             fs_objects.object_id,
             fs_objects.live_revision,
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

    set delete_url [export_vars -base ${fs_url}delete {object_id return_url {confirm_p 1}}]
}

if {$format eq "json"} {
    package require json::write
    set objects [list]
    foreach row [::template::util::multirow_to_list models] {
	foreach {key value} $row {
	    dict set row $key [::json::write string $value]
	}
	lappend objects [::json::write object {*}$row]
    }
    ns_return 200 application/json [::json::write array {*}$objects]
    ad_script_abort
}
