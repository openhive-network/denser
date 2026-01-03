#!/bin/bash

set -e

echo "Rolling back to previous version..."
docker service rollback denser_denser-blog
docker service rollback denser_denser-wallet
echo "Done. Check status: docker service ls"
