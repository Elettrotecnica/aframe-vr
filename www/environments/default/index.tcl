ad_page_contract {

    This is the default VR environment, showcasing the main features
    of this package.

}

::permission::require_permission \
    -object_id [ad_conn package_id] \
    -privilege write

set package_url [ad_conn package_url]
