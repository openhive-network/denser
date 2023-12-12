variable "CI_REGISTRY_IMAGE" {
    default = "registry.gitlab.syncad.com/hive/denser"
}
variable "CI_COMMIT_SHORT_SHA" {}
variable "CI_COMMIT_TAG" {}
variable "TAG" {
  default = "latest"
}
variable "TURBO_APP_SCOPE" {}
variable "TURBO_APP_PATH" {}

function "notempty" {
  params = [variable]
  result = notequal("", variable)
}

function "trimtagname" {
  params = [tagname, char_set]
  result = trim(tagname, char_set)
}

target "local-build" {
  dockerfile = "Dockerfile"
  tags = [
    "${CI_REGISTRY_IMAGE}/${trimtagname(TURBO_APP_SCOPE, "@hive/")}:${TAG}",
    notempty(CI_COMMIT_SHORT_SHA) ? "${CI_REGISTRY_IMAGE}/${trimtagname(TURBO_APP_SCOPE, "@hive/")}:${CI_COMMIT_SHORT_SHA}": "",
    notempty(CI_COMMIT_TAG) ? "${CI_REGISTRY_IMAGE}/${trimtagname(TURBO_APP_SCOPE, "@hive/")}:${CI_COMMIT_TAG}": ""
  ]
  args = {
    TURBO_APP_SCOPE = "${TURBO_APP_SCOPE}",
    TURBO_APP_PATH = "${TURBO_APP_PATH}",
  }
}

target "ci-build" {
  inherits = ["local-build"]
  cache-from = [
    "type=registry,ref=${CI_REGISTRY_IMAGE}/${trimtagname(TURBO_APP_SCOPE, "@hive/")}/cache:${TAG}"
  ]
  cache-to = [
    "type=registry,mode=max,image-manifest=true,ref=${CI_REGISTRY_IMAGE}/${trimtagname(TURBO_APP_SCOPE, "@hive/")}/cache:${TAG}"
  ]
  output = [
    "type=registry"
  ]
}