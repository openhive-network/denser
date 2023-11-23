#!/usr/bin/env bash


write_version() {

  #
  # Reads some data from git to get code version
  # and writes it as json file.
  #

  FILE=${1:-version.json}
  COMMITHASH="$(git rev-parse HEAD)";
  BRANCH="$(git rev-parse --abbrev-ref HEAD)";
  VERSION="$(git describe --always --tags --dirty)";

  # echo $VERSION;
  # echo $BRANCH;
  # echo $COMMITHASH;
  # echo $COMMITHASH | sed -r -e 's/^(.{8})(.*)$/\1/g'

  VERSION=$(echo $VERSION | sed -r -e "s/-g[0-9a-fA-F]{8}/-${COMMITHASH:0:8}/")
  JSON="{\"branch\":\"$BRANCH\",\"commithash\":\"$COMMITHASH\",\"version\":\"$VERSION\"}"
  echo $JSON > version.json
  echo "File $FILE has been created"

}

write_version
