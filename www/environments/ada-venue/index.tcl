ad_page_contract {

    This environment uses a venue model by Ada Rose Cannon.

    @see https://github.com/AdaRoseCannon/aframe-xr-boilerplate

}

::permission::require_permission \
    -object_id [ad_conn package_id] \
    -privilege write

set package_url [ad_conn package_url]
