ad_page_contract {
    Route to the right room, setting environment and other stuff.
}

set environment [parameter::get -parameter environment -default default]

ad_returnredirect environments/${environment}
ad_script_abort
