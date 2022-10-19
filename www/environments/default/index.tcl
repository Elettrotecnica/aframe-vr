ad_page_contract {

    This is the default VR environment, showcasing the main features
    of this package.

}

auth::require_login
if {![acs_user::site_wide_admin_p]} {
    ns_returnunauthorized
    ad_script_abort
}

set package_url [ad_conn package_url]
