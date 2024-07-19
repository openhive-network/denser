# syntax=docker/dockerfile:1.5
ARG PLAYWRIGHT_TAG=v1.41.1-jammy
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_TAG}

RUN <<EOF
set -e
apt update
apt install -y faketime
apt clean
rm -r /var/lib/apt/lists/* 
EOF