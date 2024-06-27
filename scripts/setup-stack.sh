#! /bin/bash

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

# Script configuration
ENV_PATH="${ENV_PATH:-"${SRC_DIR}/stack/.env"}"
FAKETIME=""
BLOCK_LOG_UTIL_PATH="${BLOCK_LOG_UTIL_PATH:-}"

# Ports
DOCKER_TLS_PORT=${DOCKER_TLS_PORT:-2376}
API_HTTP_PORT=${API_HTTP_PORT:-80}
API_HTTPS_PORT=${API_HTTPS_PORT:-443}
AUTH_PORT=${AUTH_PORT:-5000}
BLOG_PORT=${BLOG_PORT:-3000}
WALLET_PORT=${WALLET_PORT:-4000}

# Stack config
HIVE_API_NODE_VERSION="1.27.5"
HAF_REGISTRY=${HAF_REGISTRY:-"registry.gitlab.syncad.com/hive/haf"}
HIVEMIND_INSTANCE_IMAGE=${HIVEMIND_INSTANCE_IMAGE:-"registry.gitlab.syncad.com/hive/hivemind"}
HAFAH_REGISTRY=${HAFAH_REGISTRY:-"registry.gitlab.syncad.com/hive/hafah"}
DIND_TAG=${DIND_TAG:-"latest"}
COMPOSE_TAG=${COMPOSE_TAG:-"latest"}
AUTH_IMAGE_TAG=${AUTH_IMAGE_TAG:-"latest"}
BLOG_IMAGE_TAG=${BLOG_IMAGE_TAG:-"latest"}
WALLET_IMAGE_TAG=${WALLET_IMAGE_TAG:-"latest"}
HAF_VERSION=${HAF_VERSION:-"1.27.5rc9"}
HIVEMIND_INSTANCE_VERSION=${HIVEMIND_INSTANCE_VERSION:-"1.27.5rc9"}
HAFAH_VERSION=${HAFAH_VERSION:-"1.27.5rc9"}
REACT_APP_CHAIN_ID=${REACT_APP_CHAIN_ID:-"beeab0de00000000000000000000000000000000000000000000000000000000"}
ARGUMENTS=${ARGUMENTS:-}
PUBLIC_HOSTNAME=${PUBLIC_HOSTNAME:-"$(echo "$(hostname).local" | tr '[:upper:]' '[:lower:]')"}
USE_FAKETIME=${USE_FAKETIME:-"false"}
USE_ALTERNATE_HAPROXY_CONFIG=${USE_ALTERNATE_HAPROXY_CONFIG:-"false"}
HAF_CONFIG_PATH="${HAF_CONFIG_PATH:-}"
ALTERNATE_CHAIN_SPEC_PATH="${ALTERNATE_CHAIN_SPEC_PATH:-}"
HAF_DATA_DIRECTORY=${HAF_DATA_DIRECTORY:-"$(realpath "${SRC_DIR}/stack/haf-datadir")"}
BLOCK_LOG_SOURCE=${BLOCK_LOG_SOURCE:-}

# Denser config
REACT_APP_IMAGES_ENDPOINT="https://images.hive.blog/"

print_help () {
cat <<EOF
Usage: $0 OPTION[=VALUE]...

Script for setting up an API stack for Denser
OPTIONS:
  --env-path=PATH                           Path to dotenv file where the configuarion should be saved (default: ${SRC_DIR}/stack/.env)
  --docker-tls-port=PORT                    Docker-in-Docker daemon port (default: 2376)
  --api-http-port=PORT                      API HTTP port (default: 80)
  --api-https-port=PORT                     API HTTPS port (default: 443)
  --auth-port=PORT                          Port used by the auth app (default: 5000)
  --blog-port=PORT                          Port used by the blog app (default: 4000)
  --wallet-port=PORT                        Port used by the wallet app (default: 3000)
  --haf-registry=REGISTRY                   HAF registry (default: registry.gitlab.syncad.com/hive/haf)
  --hivemind-registry=REGISTRY              Hivemind registry (default: registry.gitlab.syncad.com/hive/hivemind)
  --hafah-registry=REGISTRY                 HAfAH registry (default: registry.gitlab.syncad.com/hive/hafah)
  --dind-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/haf_api_node/dind to use (default: latest)
  --compose-tag=TAG                         Tag of registry.gitlab.syncad.com/hive/haf_api_node/compose to use (default: latest)
  --auth-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/denser/auth to use (default: latest)
  --blog-tag=TAG                            Tag of registry.gitlab.syncad.com/hive/denser/blog to use (default: latest)
  --wallet-tag=TAG                          Tag of registry.gitlab.syncad.com/hive/denser/wallet to use (default:latest)
  --haf-version=TAG                         HAF tag to use (default: 1.27.5rc9)
  --hivemind-version=TAG                    Hivemind tag to use (default: 1.27.5rc9)
  --hafah-version=TAG                       HAfAH tag to use (default: 1.27.5rc9)
  --chain-id=STRING                         Chain ID tu use (default: beeab0de00000000000000000000000000000000000000000000000000000000)
  --haf-arguments=STRING                    Arguments to be passed to the HAF instance in the stack (default: empty string)
  --public-hostname=HOSTNAME                Public hostname or domain name of the stack (default: $(echo "$(hostname).local" | tr '[:upper:]' '[:lower:]'))
  --use-faketime=true/false                 Set up faketime in HAF instance based on the last block of provided block log, requires --block-log-source and --block-log-util-path (default: false)
  --use-alternate-haproxy-config=true/false Use alternate HAProxy configuration - enable if stack is not going to be live syncing (default: false)
  --haf-config-path=PATH                    Path to config.ini file for HAF service (default: empty string)
  --alternate-chain-spec=PATH               Path to alternate chain spec file (default: empty string)
  --haf-data-directory=DIR                  Directory for the stack data and logs (default: $(realpath "${SRC_DIR}/stack/haf-datadir"))
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

if [[ -n "${ALTERNATE_CHAIN_SPEC_PATH}" ]]
then
    if [[ -f "${ALTERNATE_CHAIN_SPEC_PATH}" ]]
    then
        echo "Setting up the alternate chain spec file..."
        mkdir -p "${HAF_DATA_DIRECTORY}/blockchain"
        cp "${ALTERNATE_CHAIN_SPEC_PATH}" "${HAF_DATA_DIRECTORY}/blockchain/alternate-chain-spec.json"
        ARGUMENTS="${ARGUMENTS} --alternate-chain-spec=/home/hived/datadir/blockchain/alternate-chain-spec.json"
    else
        echo "${HAF_CONFIG_PATH} is not a file. Exiting script..."
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
HIVE_API_NODE_VERSION=${HIVE_API_NODE_VERSION}
HAF_REGISTRY=${HAF_REGISTRY}
HIVEMIND_INSTANCE_IMAGE=${HIVEMIND_INSTANCE_IMAGE}
HAFAH_REGISTRY=${HAFAH_REGISTRY}
DIND_TAG=${DIND_TAG}
COMPOSE_TAG=${COMPOSE_TAG}
AUTH_IMAGE_TAG=${AUTH_IMAGE_TAG}
BLOG_IMAGE_TAG=${AUTH_IMAGE_TAG}
WALLET_IMAGE_TAG=${WALLET_IMAGE_TAG}
HAF_VERSION=${HAF_VERSION}
HIVEMIND_INSTANCE_VERSION=${HIVEMIND_INSTANCE_VERSION}
HAFAH_VERSION=${HAFAH_VERSION}
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