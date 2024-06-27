#!/bin/bash

set -e

LIBPQ="$(sudo find / -name libpq.so.5* -type f 2>/dev/null)"
echo "LIBPQ=${LIBPQ:?}"
cp "${LIBPQ}" "${BINARY_CACHE_PATH:?}/libpq.so.5"