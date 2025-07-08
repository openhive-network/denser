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
variable "BUILD_TIME" {}
variable "GIT_COMMIT_SHA" {}
variable "GIT_CURRENT_BRANCH" {}
variable "GIT_LAST_LOG_MESSAGE" {}
variable "GIT_LAST_COMMITTER" {}
variable "GIT_LAST_COMMIT_DATE" {}

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
    TURBO_APP_NAME = "${TURBO_APP_NAME}",
    BUILD_TIME = "${BUILD_TIME}",
    GIT_COMMIT_SHA = "${GIT_COMMIT_SHA}",
    GIT_CURRENT_BRANCH = "${GIT_CURRENT_BRANCH}",
    GIT_LAST_LOG_MESSAGE = "${GIT_LAST_LOG_MESSAGE}",
    GIT_LAST_COMMITTER = "${GIT_LAST_COMMITTER}",
    GIT_LAST_COMMIT_DATE = "${GIT_LAST_COMMIT_DATE}",
  }
  output = [
    "type=docker"
  ]
  platforms = ["linux/arm64/v8"]
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