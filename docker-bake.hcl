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
variable "TURBO_APP_NAME" {}

function "notempty" {
  params = [variable]
  result = notequal("", variable)
}

target "local-build" {
  dockerfile = "Dockerfile"
  tags = [
    "${CI_REGISTRY_IMAGE}/${TURBO_APP_NAME}:${TAG}",
    notempty(CI_COMMIT_SHORT_SHA) ? "${CI_REGISTRY_IMAGE}/${TURBO_APP_NAME}:${CI_COMMIT_SHORT_SHA}": "",
    notempty(CI_COMMIT_TAG) ? "${CI_REGISTRY_IMAGE}/${TURBO_APP_NAME}:${CI_COMMIT_TAG}": ""
  ]
  args = {
    TURBO_APP_SCOPE = "${TURBO_APP_SCOPE}",
    TURBO_APP_PATH = "${TURBO_APP_PATH}",
  }
  output = [
    "type=docker"
  ]
}

target "ci-build" {
  inherits = ["local-build"]
  cache-from = [
    "type=registry,ref=${CI_REGISTRY_IMAGE}/${TURBO_APP_NAME}/cache:${TAG}"
  ]
  cache-to = [
    "type=registry,mode=max,image-manifest=true,ref=${CI_REGISTRY_IMAGE}/${TURBO_APP_NAME}/cache:${TAG}"
  ]
  output = [
    "type=registry"
  ]
}