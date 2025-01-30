#!/bin/bash

set -e

if [ ! -e "${BLOCK_LOG_SOURCE:?}/block_log.artifacts" ]
then
    echo "Generating blog_log.artifacts file..."
    "${BLOCK_LOG_UTIL_PATH:?}" --generate-artifacts --block-log "${BLOCK_LOG_SOURCE:?}/block_log"
fi

echo "Getting the head block's number..."
HEAD_BLOCK_NUMBER=$("${BLOCK_LOG_UTIL_PATH:?}" --get-head-block-number --block-log "${BLOCK_LOG_SOURCE:?}/block_log")
echo "Head block number is: ${HEAD_BLOCK_NUMBER:?}"

echo "Obtaining timestamp of the latest block..."
HEAD_BLOCK_TIMESTAMP=$("${BLOCK_LOG_UTIL_PATH:?}" --get-block -n "${HEAD_BLOCK_NUMBER:?}" --block-log "${BLOCK_LOG_SOURCE:?}/block_log" |  grep -o '"timestamp":"[^"]*"' | awk -F'"' '{print $4}' | sed 's/\(.*\)-\(.*\)-\(.*\)T\(.*\)/@\1-\2-\3 \4/')

echo "Faketime will be set to ${HEAD_BLOCK_TIMESTAMP:?}"

{
    echo "LAST_BLOCK_NUMBER=${HEAD_BLOCK_NUMBER:?}"
    echo "HEAD_BLOCK_TIMESTAMP=${HEAD_BLOCK_TIMESTAMP:?}"
} > block_log_data.env