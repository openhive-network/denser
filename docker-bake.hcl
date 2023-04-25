variable "CI_REGISTRY_IMAGE" {
    default = "registry.gitlab.syncad.com/hive/denser"
}
variable "CI_COMMIT_SHA" {}
variable "TAG" {
  default = "latest"
}

function "notempty" {
  params = [variable]
  result = notequal("", variable)
}

target "local-build" {
  dockerfile = "Dockerfile"
  tags = [
    "${CI_REGISTRY_IMAGE}:${TAG}",
    notempty(CI_COMMIT_SHA) ? "${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}": ""
  ]
}

target "ci-build" {
  inherits = ["local-build"]
  cache-from = [
    "type=registry,ref=${CI_REGISTRY_IMAGE}/cache:${TAG}"
  ]
  cache-to = [
    "type=registry,mode=max,ref=${CI_REGISTRY_IMAGE}/cache:${TAG}"
  ]
  output = [
    "type=registry"
  ]
}