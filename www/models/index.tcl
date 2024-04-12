ad_page_contract {

    Ui to upload and manage gltf models.

    @param format when "json", the page will return a JSON formatted
                  array of the available models, useful to load models
                  on the fly on the scene.  When "assets", the page
                  will return models in form of A-Frame assets, meant
                  to be load at the start of the experience. The
                  default empty string will return the UI.

} {
    orderby:token,optional
    {format:oneof(|json|assets) ""}
}
