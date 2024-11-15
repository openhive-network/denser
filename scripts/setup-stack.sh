#! /bin/bash

set -e

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

# Script configuration
ENV_PATH="${ENV_PATH:-"${SRC_DIR}/stack/mirrornet-stack.env"}"
FAKETIME=""
BLOCK_LOG_UTIL_PATH="${BLOCK_LOG_UTIL_PATH:-}"

# Ports
DOCKER_TLS_PORT=${DOCKER_TLS_PORT:-22376}
API_HTTP_PORT=${API_HTTP_PORT:-8080}
API_HTTPS_PORT=${API_HTTPS_PORT:-8443}
AUTH_PORT=${AUTH_PORT:-5000}
BLOG_PORT=${BLOG_PORT:-3000}
WALLET_PORT=${WALLET_PORT:-4000}

# Stack config
HAF_REGISTRY=${HAF_REGISTRY:-"registry.gitlab.syncad.com/hive/haf/mirrornet-instance"}
HIVEMIND_INSTANCE_IMAGE=${HIVEMIND_INSTANCE_IMAGE:-"registry.gitlab.syncad.com/hive/hivemind/instance"}
HAFAH_REGISTRY=${HAFAH_REGISTRY:-"registry.gitlab.syncad.com/hive/hafah/instance"}
REPUTATION_TRACKER_REGISTRY=${REPUTATION_TRACKER_REGISTRY:-"registry.gitlab.syncad.com/hive/reputation_tracker"}
DIND_TAG=${DIND_TAG:-"90486532"}
COMPOSE_TAG=${COMPOSE_TAG:-"90486532"}
AUTH_IMAGE_TAG=${AUTH_IMAGE_TAG:-"local"}
BLOG_IMAGE_TAG=${BLOG_IMAGE_TAG:-"local"}
WALLET_IMAGE_TAG=${WALLET_IMAGE_TAG:-"local"}
HAF_VERSION=${HAF_VERSION:-"13b9a6f7"}
HIVEMIND_INSTANCE_VERSION=${HIVEMIND_INSTANCE_VERSION:-"daede252"}
HAFAH_VERSION=${HAFAH_VERSION:-"a7cf1e38"}
REPUTATION_TRACKER_VERSION=${REPUTATION_TRACKER_VERSION:-"762663b3"}
REACT_APP_CHAIN_ID=${REACT_APP_CHAIN_ID:-"44"}
ARGUMENTS=${ARGUMENTS:-"--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block 5000785"}
PUBLIC_HOSTNAME=${PUBLIC_HOSTNAME:-"$(echo "$(hostname).local" | tr '[:upper:]' '[:lower:]')"}
USE_FAKETIME=${USE_FAKETIME:-"true"}
USE_ALTERNATE_HAPROXY_CONFIG=${USE_ALTERNATE_HAPROXY_CONFIG:-"true"}
HAF_CONFIG_PATH="${HAF_CONFIG_PATH:-"$(realpath "${SRC_DIR}/stack/mirrornet_haf_config.ini")"}"
ALTERNATE_CHAIN_SPEC_PATH="${ALTERNATE_CHAIN_SPEC_PATH:-}"
HAF_DATA_DIRECTORY=${HAF_DATA_DIRECTORY:-"/srv/haf-pool/haf-datadir"}
BLOCK_LOG_SOURCE=${BLOCK_LOG_SOURCE:-}

# Denser config
REACT_APP_IMAGES_ENDPOINT="https://images.hive.blog/"

print_help () {
cat <<EOF
Usage: $0 OPTION[=VALUE]...

Script for setting up an API stack for Denser
OPTIONS:
  --env-path=PATH                           Path to dotenv file where the configuarion should be saved (default: $(realpath "${SRC_DIR}/stack/mirrornet-stack.env"))
  --docker-tls-port=PORT                    Docker-in-Docker daemon port (default: 2376)
  --api-http-port=PORT                      API HTTP port (default: 80)
  --api-https-port=PORT                     API HTTPS port (default: 443)
  --auth-port=PORT                          Port used by the auth app (default: 5000)
  --blog-port=PORT                          Port used by the blog app (default: 4000)
  --wallet-port=PORT                        Port used by the wallet app (default: 3000)
  --haf-registry=REGISTRY                   HAF registry (default: registry.gitlab.syncad.com/hive/haf/mirrornet-instance)
  --hivemind-registry=REGISTRY              Hivemind registry (default: registry.gitlab.syncad.com/hive/hivemind/instance)
  --hafah-registry=REGISTRY                 HAfAH registry (default: registry.gitlab.syncad.com/hive/hafah/instance)
  --reptracker-registry=REGISTRY            Reputation Tracker registry (default: registry.gitlab.syncad.com/hive/reputation_tracker)
  --dind-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/haf_api_node/dind to use (default: 90486532)
  --compose-tag=TAG                         Tag of registry.gitlab.syncad.com/hive/haf_api_node/compose to use (default: 90486532)
  --auth-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/denser/auth to use (default: local)
  --blog-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/denser/blog to use (default: local)
  --wallet-tag=TAG                          Tag of registry.gitlab.syncad.com/hive/denser/wallet to use (default: local)
  --haf-version=TAG                         HAF tag to use (default: 13b9a6f7)
  --hivemind-version=TAG                    Hivemind tag to use (default: daede252)
  --hafah-version=TAG                       HAfAH tag to use (default: a7cf1e38)
  --reptracker-version=TAG                  Reputation tracker tag to use (default: 762663b3)
  --chain-id=STRING                         Chain ID tu use (default: 44)
  --haf-arguments=STRING                    Arguments to be passed to the HAF instance in the stack (default: --chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block 5000785)
  --public-hostname=HOSTNAME                Public hostname or domain name of the stack (default: $(echo "$(hostname).local" | tr '[:upper:]' '[:lower:]'))
  --use-faketime=true/false                 Set up faketime in HAF instance based on the last block of provided block log, requires --block-log-source and --block-log-util-path (default: true)
  --use-alternate-haproxy-config=true/false Use alternate HAProxy configuration - enable if stack is not going to be live syncing (default: true)
  --haf-config-path=PATH                    Path to config.ini file for HAF service (default: $(realpath "${SRC_DIR}/stack/mirrornet_haf_config.ini"))
  --alternate-chain-spec=PATH               Path to alternate chain spec file (default: empty string)
  --haf-data-directory=DIR                  Directory for the stack data and logs (default: /srv/haf-pool/haf-datadir))
  --block-log-source=DIR                    Full path to directory containing block_log to copy to the stack's datadir (default: empty string)
  --block-log-util-path=PATH                Full path to the block log utility tool (default: empty string)

  --help,-h,-?                              Display this help screen and exit

EOF
}

set -e

while [ $# -gt 0 ]; do
  case "$1" in
    --env-path=*)
        arg="${1#*=}"
        ENV_PATH="$arg"
        ;;
    --docker-tls-port=*)
        arg="${1#*=}"
        DOCKER_TLS_PORT="$arg"
        ;;
    --api-http-port=*)
        arg="${1#*=}"
        API_HTTP_PORT="$arg"
        ;;
    --api-https-port=*)
        arg="${1#*=}"
        API_HTTPS_PORT="$arg"
        ;;
    --auth-port=*)
        arg="${1#*=}"
        AUTH_PORT="$arg"
        ;;
    --blog-port=*)
        arg="${1#*=}"
        BLOG_PORT="$arg"
        ;;
    --wallet-port=*)
        arg="${1#*=}"
        WALLET_PORT="$arg"
        ;;
    --haf-registry=*)
        arg="${1#*=}"
        HAF_REGISTRY="$arg"
        ;;
    --hivemind-registry=*)
        arg="${1#*=}"
        HIVEMIND_INSTANCE_IMAGE="$arg"
        ;;
    --hafah-registry=*)
        arg="${1#*=}"
        HAFAH_REGISTRY="$arg"
        ;;
    --reptracker-registry=*)
        arg="${1#*=}"
        REPUTATION_TRACKER_REGISTRY="$arg"
        ;;
    --dind-tag=*)
        arg="${1#*=}"
        DIND_TAG="$arg"
        ;;
    --compose-tag=*)
        arg="${1#*=}"
        COMPOSE_TAG="$arg"
        ;;
    --auth-tag=*)
        arg="${1#*=}"
        AUTH_IMAGE_TAG="$arg"
        ;;
    --blog-tag=*)
        arg="${1#*=}"
        BLOG_IMAGE_TAG="$arg"
        ;;
    --wallet-tag=*)
        arg="${1#*=}"
        WALLET_IMAGE_TAG="$arg"
        ;;    
    --haf-version=*)
        arg="${1#*=}"
        HAF_VERSION="$arg"
        ;;
    --hivemind-version=*)
        arg="${1#*=}"
        HIVEMIND_INSTANCE_VERSION="$arg"
        ;;
    --hafah-version=*)
        arg="${1#*=}"
        HAFAH_VERSION="$arg"
        ;;
    --reptracker-version=*)
        arg="${1#*=}"
        REPUTATION_TRACKER_VERSION="$arg"
        ;;
    --chain-id=*)
        arg="${1#*=}"
        REACT_APP_CHAIN_ID="$arg"
        ;;
    --haf-arguments=*)
        arg="${1#*=}"
        ARGUMENTS="$arg"
        ;;
    --public-hostname=*)
        arg="${1#*=}"
        PUBLIC_HOSTNAME="$arg"
        ;;
    --use-faketime=*)
        arg="${1#*=}"
        USE_FAKETIME="$arg"
        ;;
    --use-alternate-haproxy-config=*)
        arg="${1#*=}"
        USE_ALTERNATE_HAPROXY_CONFIG="$arg"
        ;;
    --haf-config-path=*)
        arg="${1#*=}"
        HAF_CONFIG_PATH="$arg"
        ;;
    --alternate-chain-spec=*)
        arg="${1#*=}"
        ALTERNATE_CHAIN_SPEC_PATH="$arg"
        ;;
    --haf-data-directory=*)
        arg="${1#*=}"
        HAF_DATA_DIRECTORY="$arg"
        ;;
    --block-log-source=*)
        arg="${1#*=}"
        BLOCK_LOG_SOURCE="$arg"
        ;;
    --block-log-util-path=*)
        arg="${1#*=}"
        BLOCK_LOG_UTIL_PATH="$arg"
        ;;    
    --help|-h|-\?)
        print_help
        exit 0
        ;;
    *)
        echo "ERROR: '$1' is not a valid option/positional argument"
        echo
        print_help
        exit 2
        ;;
    esac
    shift
done

echo "Creating data directory for the stack..."
if ! mkdir -p "${HAF_DATA_DIRECTORY}"
then
    echo "Elevated permisions required to create the data directory."
    sudo mkdir -p "${HAF_DATA_DIRECTORY}"
    sudo chown "$(id -u):$(id -g)" "${HAF_DATA_DIRECTORY}"
fi

if [[ -n "${HAF_CONFIG_PATH}" ]]
then
    if [[ -f "${HAF_CONFIG_PATH}" ]]
    then
        cp "${HAF_CONFIG_PATH}" "${HAF_DATA_DIRECTORY}/config.ini"
    else
        echo "${HAF_CONFIG_PATH} is not a file. Exiting script..."
        exit 1
    fi
fi

ALTERNATE_CHAIN_SPEC_PATH=${ALTERNATE_CHAIN_SPEC_PATH:-"${BLOCK_LOG_SOURCE:-}/alternate-chain-spec.json"}

if [[ -n "${ALTERNATE_CHAIN_SPEC_PATH}" ]]
then
    if [[ -f "${ALTERNATE_CHAIN_SPEC_PATH}" ]]
    then
        echo "Setting up the alternate chain spec file..."
        mkdir -p "${HAF_DATA_DIRECTORY}/blockchain"
        cp "${ALTERNATE_CHAIN_SPEC_PATH}" "${HAF_DATA_DIRECTORY}/blockchain/alternate-chain-spec.json"
        ARGUMENTS="${ARGUMENTS} --alternate-chain-spec=/home/hived/datadir/blockchain/alternate-chain-spec.json"
    else
        echo "${ALTERNATE_CHAIN_SPEC_PATH} is not a file. Exiting script..."
        exit 1
    fi
fi

if [[ -n "${BLOCK_LOG_SOURCE}" ]]
then
    if [[ "${USE_FAKETIME}" == "true" ]]
    then
        if [[ -f "${BLOCK_LOG_SOURCE}/block_log" ]]
        then
            if [[ -x "${BLOCK_LOG_UTIL_PATH}" ]]
            then
                if [ ! -e "${BLOCK_LOG_SOURCE}/block_log.artifacts" ]
                then
                    echo "Generating blog_log.artifacts file..."
                    "${BLOCK_LOG_UTIL_PATH}" --generate-artifacts --block-log "${BLOCK_LOG_SOURCE}/block_log"
                fi

                echo "Getting the head block's number..."
                HEAD_BLOCK_NUMBER=$("${BLOCK_LOG_UTIL_PATH}" --get-head-block-number --block-log "${BLOCK_LOG_SOURCE}/block_log")
                echo "Head block number is: ${HEAD_BLOCK_NUMBER}"
                echo "${HEAD_BLOCK_NUMBER}" > /tmp/head_block_number

                echo "Obtaining timestamp of the latest block..."
                FAKETIME=$("${BLOCK_LOG_UTIL_PATH}" --get-block -n "${HEAD_BLOCK_NUMBER}" --block-log "${BLOCK_LOG_SOURCE}/block_log" |  grep -o '"timestamp":"[^"]*"' | awk -F'"' '{print $4}' | sed 's/\(.*\)-\(.*\)-\(.*\)T\(.*\)/@\1-\2-\3 \4/')

                echo "Faketime will be set to ${FAKETIME}"
            else
                echo "${BLOCK_LOG_UTIL_PATH} is not an executable file. Exiting script..."
                exit 1
            fi
        else
            echo "${BLOCK_LOG_SOURCE}/block_log is not a file. Exiting script..."
            exit 1
        fi
    fi

    if [[ -d "${BLOCK_LOG_SOURCE}" ]]
    then 
        echo "Copying the block log file..."
        mkdir -p "${HAF_DATA_DIRECTORY}/blockchain"
        cp -u "${BLOCK_LOG_SOURCE}/block_log" "${HAF_DATA_DIRECTORY}/blockchain/block_log"
        if [ -e "${BLOCK_LOG_SOURCE}/block_log.artifacts" ];
        then
            echo "Copying the artifacts file..." 
            cp "${BLOCK_LOG_SOURCE}/block_log.artifacts" "${HAF_DATA_DIRECTORY}/blockchain/block_log.artifacts"
        fi
    else
        echo "${BLOCK_LOG_SOURCE} is not a directory. Exiting script..."
        exit 1
    fi
fi

echo "Creating stack's configuration file..."
cat <<EOF > "${ENV_PATH}"
#Ports
DOCKER_TLS_PORT=${DOCKER_TLS_PORT}
API_HTTP_PORT=${API_HTTP_PORT}
API_HTTPS_PORT=${API_HTTPS_PORT}
AUTH_PORT=${AUTH_PORT}
BLOG_PORT=${BLOG_PORT}
WALLET_PORT=${WALLET_PORT}

# Stack config
HAF_REGISTRY=${HAF_REGISTRY}
HIVEMIND_INSTANCE_IMAGE=${HIVEMIND_INSTANCE_IMAGE}
HAFAH_REGISTRY=${HAFAH_REGISTRY}
REPUTATION_TRACKER_REGISTRY=${REPUTATION_TRACKER_REGISTRY}
DIND_TAG=${DIND_TAG}
COMPOSE_TAG=${COMPOSE_TAG}
AUTH_IMAGE_TAG=${AUTH_IMAGE_TAG}
BLOG_IMAGE_TAG=${AUTH_IMAGE_TAG}
WALLET_IMAGE_TAG=${WALLET_IMAGE_TAG}
HAF_VERSION=${HAF_VERSION}
HIVEMIND_INSTANCE_VERSION=${HIVEMIND_INSTANCE_VERSION}
HAFAH_VERSION=${HAFAH_VERSION}
REPUTATION_TRACKER_VERSION=${REPUTATION_TRACKER_VERSION}
REACT_APP_CHAIN_ID=${REACT_APP_CHAIN_ID}
ARGUMENTS=${ARGUMENTS}
PUBLIC_HOSTNAME=${PUBLIC_HOSTNAME}
FAKETIME=${FAKETIME}
USE_ALTERNATE_HAPROXY_CONFIG=${USE_ALTERNATE_HAPROXY_CONFIG}
HAF_DATA_DIRECTORY=${HAF_DATA_DIRECTORY}
BLOCK_LOG_SOURCE=${BLOCK_LOG_SOURCE}

# Denser config
REACT_APP_IMAGES_ENDPOINT="${REACT_APP_IMAGES_ENDPOINT}"
EOF
echo "Done!"