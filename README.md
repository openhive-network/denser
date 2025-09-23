# Denser

**Decentralized social media app for Hive Blockchain ⛓️**
Successor to hive/condenser> aka [hive.blog](https://hive.blog/).

## Introduction

The project consists of three apps:

- auth (obsolete)
- blog
- wallet

## Prerequisites

- Node.js >= 20.0.0 & <21.0.0

If you have Volta installed, the 20.11.1 version of Node.js in pinned in the main [package.json](package.json) file.

## Building

We are using pnpm for building the project. If you do not have pnpm, you can install it via

```bash
npm install -g pnpm
```

Next, you can run following commands install the dependencies and build the apps

```bash
pnpm install

pnpm run build:blog
pnpm run build:wallet
```

## Running

The following commands start the blog app on port 3000, the wallet app on port 4000:

```bash
pnpm run start:blog
pnpm run start:wallet
```

## Testing

To run tests use the following commands:

```bash
pnpm run all:pw:test:local
```

You can run the test for only the blog or only the wallet apps using one of the following commands:

```bash
pnpm run blog:pw:test:local
pnpm run wallet:pw:test:local
```

## Dockerisation

### Build

To build Docker images use the following commands:

```bash
./scripts/build_instance.sh --app-scope='@hive/blog' --app-path='/apps/blog' --app-name='blog' "$(pwd)"
./scripts/build_instance.sh --app-scope='@hive/wallet' --app-path='/apps/wallet' --app-name='wallet' "$(pwd)"
```

All the options available can be displayed by running `scripts/build_instance.sh --help`.

### Startup

To start Docker images run the following commands:

```bash
./scripts/run_instance.sh \
        --image="registry.gitlab.syncad.com/hive/denser/blog:latest" \
        --name="denser-blog" \
        --env-file=/home/hive/denser/.env \
        --port=3000 \
        --detach

./scripts/run_instance.sh \
        --image="registry.gitlab.syncad.com/hive/denser/wallet:latest" \
        --name="denser-wallet" \
        --env-file=/home/hive/denser/.env \
        --port=4000 \
        --detach
```

They will start the blog app on port 3000 and the wallet app on port 4000.
The containers will delete themselves once stopped.

All the options available can be displayed by running `scripts/run_instance.sh --help`.

Alternatively, you can use the [Composefile](docker/docker-compose.yml) - ports will be the same as above:

```bash
pushd docker
docker compose up --detach
```

If you wish to change parameters (like API endpoints or ports) when
using the [Composefile](docker/docker-compose.yml), edit the
accompanying [.env file](docker/.env)

To stop and delete the containers use command `docker compose down`.

### HAF API stack

#### Quickstart

There are two quickstart scripts available for quickly setting up a local mirrornet HAF API stack:

- [scripts/quickstart-stack-setup-replay.sh](scripts/quickstart-stack-setup-replay.sh),
- [scripts/quickstart-stack-restart-from-backup.sh](scripts/quickstart-stack-restart-from-backup.sh).

Those scripts use commands described in the next section exactly as shown in the examples.

Script `quickstart-stack-setup-replay.sh` performs the following actions:

- initializing and updating of Git submodules,
- stopping and deleting a stack set up with the previous invocation of the script,
- downloading and installing the newest block_log_util from HAF's develop branch,
- downloading and extracting the mirrornet block log, artifacts and alternate chain spec files,
- building local Denser Docker images,
- setting up the local mirrornet stack,
- replaying the block log and syncing the apps,
- creating a backup of the stack's data directory,
- starting the stack in block generating mode.

Script `quickstart-stack-restart-from-backup.sh` performs the following actions:

- building local Denser Docker images,
- deleting the stack's data directory and restoring it from backup,
- starting the stack in block generating mode.

Setting up the stack is, therefore, as simple as running:

```bash
./scripts/quickstart-stack-setup-replay.sh
```

This command will take a very long time. Once it finishes Denser should be available at [https://your-hostname.local:3000] and the stack's API endpoint at [https://your-hostname.local:8443]. If you have a proper domain and certificates, they should be configured at this point - details are in the next section. Once you set up the certificates, the stack needs to be stopped and restarted as described below. The endpoints will change to [https://your.domain.name:3000] and [https://your.domain.name:8443].

There's a possibility the command will fail with `block_log_util: line 1: {message:404 Not found}: command not found` - this means that block_log_util is no longer available for download.  
You need to either manually rerun job `haf_image_build_mirrornet` in the latest CI pipeline for HAF's develop branch or procure it from somwehere else (eg. HAF's most recent pipeline), install it manually and comment out the `Downloading and installing block_log_util...` section of [scripts/quickstart-stack-setup-replay.sh](scripts/quickstart-stack-setup-replay.sh). In either case rerun the command.

The stack can be shut down with command:

```bash
./scripts/stop-stack.sh --env-files="$(pwd)/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

when it's no longer needed and then started up again with:

```bash
./scripts/quickstart-stack-restart-from-backup.sh
```

Both `quickstart-stack-setup-replay.sh` and `quickstart-stack-restart-from-backup.sh` may show errors when deleting the old stack if it's not present. It's completely normal.

If you're running the stack with self-signed certificates, you need to disable certificate errors in the browser, eg:

```bash
/opt/google/chrome/chrome --ignore-certificate-errors
```

Otherwise you can run the browser as normal.

#### Detailed explanation

The following scripts are provided for configuring and managing a local HAF API stack:

- [scripts/get-stack-logs.sh](scripts/get-stack-logs.sh),
- [scripts/setup-stack.sh](scripts/setup-stack.sh),
- [scripts/start-stack.sh](scripts/start-stack.sh),
- [scripts/stop-stack.sh](scripts/stop-stack.sh),
- [scripts/wait-for-stack.sh](scripts/wait-for-stack.sh).

The procedure of starting a local mirrornet stack with faketime for Denser tests is as follows:

Initialize and update the submodules:

```bash
git submodule update --init --recursive
```

Obtain the block log and the block_log_util.

Block_log_util can be downloaded and installed using the following command:

```bash
curl --location --output "${HOME}/hive-utils/block_log_util" "https://gitlab.syncad.com/api/v4/projects/323/jobs/artifacts/develop/raw/haf-mirrornet-binaries/block_log_util/?job=haf_image_build_mirrornet"
chmod +x "${HOME}/hive-utils/block_log_util"
```

You need to either manually rerun job `haf_image_build_mirrornet` in the latest CI pipeline for HAF's develop branch or procure it from somwehere else (eg. HAF's most recent pipeline) and install it manually.

After running the command, block_log_util from the latest HAF develop will be installed in `${HOME}/hive-utils/block_log_util`

Block log, alongside its accompanying alternative chain spec and artifacts files, can be obtained from a special Docker image using the following command (in this example it will be extracted to `~/mirrornet-blockchain`):

```bash
./haf/hive/scripts/ci-helpers/export-data-from-docker-image.sh registry.gitlab.syncad.com/hive/hive/extended-block-log:f8a89045 "${HOME}/mirrornet-blockchain" --image-path=/blockchain/
```

The path given here as a second argument is the same path provided later as `--block-log-source=`.

Build local Denser docker images:

```bash
./scripts/build_instance.sh --app-name="blog" --tag="local"
./scripts/build_instance.sh --app-name="wallet" --tag="local"
```

Configure the stack using the command (assuming block_log_util is in directory `${HOME}/hive-utils/block_log_util`):

```bash
./scripts/setup-stack.sh \
--block-log-source="${HOME}/mirrornet-blockchain" \
--block-log-util-path="${HOME}/hive-utils/block_log_util"
```

The are many parameters than can be used to customize the stack. You can see the full list by running `./scripts/setup-stack.sh --help`. Stack's configuration can also be altered after the script is finished running by edition the resulting dotenv file - `${SRC_DIR}/stack/mirrornet-stack.env`.

If your computer has a proper domain name, you can pass it to the stack by adding `--public-hostname` parameter to the command above, ie. `--public-hostname=your.domain.name` or editing `PUBLIC_HOSTNAME` in the generated env file.  
Otherwise the stack will use _your-hostname.local_ as its domain name.

This will create stack's data directory at `/srv/haf-pool/haf-datadir`, generate block_log.artifacts file, copy the block log, the artifacts file and the HAF ini file to the data directory and store stack's configuration in `${SRC_DIR}/stack/mirrornet-stack.env`, where `${SRC_DIR}` is Denser's source directory. The process will take a while. Once it's finished, note the value printed after `Head block number is:` in the script's output, then use it to replace the value after `--stop-at-block` in `ARGUMENTS` in the `${SRC_DIR}/stack/mirrornet-stack.env` file. **It is importatnt that the block log size is accurate.**

If your computer has a proper domain name and you have trusted certificates for that domain, you should configure them now. Place the certificate and key files in `stack/certs` directory, rename them to `cert.pem` and `key.pem` respectively and then comment out all `tls internal` lines in [stack/Caddyfile](stack/Caddyfile) and uncomment the lines below (`tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem`).

If you didn't change the default location of `mirrornet-stack.env` and wish to run commands below as they are written, run `export SRC_DIR="$(pwd)"` in Denser's source directory.

Now start the stack using the command:

```bash
./scripts/start-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

and wait for HAF replay and Hivemind sync to finish (`--wait-for-sync=` needs to be set to the value the `setup-stack.sh` script printed at `Head block number is:` line):

```bash
./scripts/wait-for-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser --wait-for-sync=5000785
```

This will likely take a long time to complete.

> Note:
> Do not run `start-stack.sh` multiple times in a row - even if starting the stack failed. Always run `stop-stack.sh` to clean up old containers
> before running `start-stack.sh` again.

Once the replay and sync are done, backup the stack's data directory to avoid having to perform replay and sync and/or adjusting the faketime every time you restart the stack.

```bash
# Stop the stack first
./scripts/stop-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser

# `sudo` is necessary due to PostgreSQL's data belonging to PostgreSQL user.
sudo cp --recursive --preserve /srv/haf-pool/haf-datadir{,.bak}
```

After completing the backup, edit you dotenv file and restart the stack.

```bash
nano "${SRC_DIR}/stack/mirrornet-stack.env" # use whichever editor you want, nano is just an example
# now remove --replay-blockchain and --stop-at-block arguments, eg. replace line
# ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block 5000785
# with
# ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n
./scripts/start-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
./scripts/wait-for-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

You can easily restore the backup with the following steps:

```bash
./scripts/stop-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
sudo rm -rf /srv/haf-pool/haf-datadir
sudo cp --recursive --preserve /srv/haf-pool/haf-datadir{.bak,}
docker volume rm mirrornet-api-stack_haf-datadir
./scripts/start-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
./scripts/wait-for-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser

```

Now that the stack is running, you can access you Denser instance on [https://your-hostname.local:3000] or [https://your.domain.name:3000] - note the HTTPS in the URL.

If you're running the stack with self-signed certificates, you need to disable certificate errors in the browser, eg:

```bash
/opt/google/chrome/chrome --ignore-certificate-errors
```

Otherwise you can run the browser as normal.

You can stop the stack with command:

```bash
./scripts/stop-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

as mentioned above.

You can obtain the stack's logs using one of the commands:

```bash
# Get logs for all services
./scripts/get-stack-logs.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser

# Get the last 10 lines logs per service for all services
./scripts/get-stack-logs.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser --tail=10

# If you want to know the service names, the easiest way is to run
./scripts/get-stack-logs.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser --tail=1
# This will display one line of logs per service for all services. Each line will start with `service-name-1  |`

# Get logs for specific service (in this case haf).
./scripts/get-stack-logs.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser --service=haf

# Save the logs to file
./scripts/get-stack-logs.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser --no-color 2>&1 > mirrornet-api-stack.log
```

In order to update Denser version (to include new local changes, for example) you need to:

- rebuild Denser's Docker images,
- stop the stack,
- restore the stack's backup,
- optionally edit the stack's dotenv file if you changed Denser's image tag,
- restart the stack.

If you're using self-signed certificates, do not worry if your browser complains about SSL certificates (NET::ERR_CERT_AUTHORITY_INVALID) and wants you to confirm accessing those URLs.

Quick cURL queries to check if the API is working properly:

```bash
curl -vk -X POST --data '{"jsonrpc":"2.0", "method":"condenser_api.get_block", "params":[1], "id":1}' https://your.domain.name:8443/ # Hive
curl -vk -X POST --data '{"jsonrpc":"2.0", "method":"block_api.get_block", "params":{"block_num":1}, "id":1}' https://your.domain.name:8443/ # HAfAH
curl -vk -X POST --data '{"jsonrpc":"2.0", "method":"condenser_api.get_blog", "params":["steem", 0, 1], "id":1}' https://your.domain.name:8443/ # Hivemind
```

API stack's individual containers are wrapped in the docker container, so they cannot be accessed directly, eg `docker inspect haf-world-haf-1`. If you need to access them, you need to do so from within the dind container, eg.

```bash
# Access the container's shell
docker exec -it mirrornet-api-stack-docker-1 sh

# Run docker command
docker inspect haf-world-haf-1

# Exit the container's shell
exit
```

#### Troubleshooting

If, while starting the stack, you get an error like:

> Error response from daemon: error while mounting volume '/var/lib/docker/volumes/mirrornet-api-stack_haf-datadir/\_data': failed to mount local volume: mount /some/path:/var/lib/docker/volumes/mirrornet-api-stack_haf-datadir/\_data, flags: 0x1000: no such file or directory

you need to stop the stack, remove the volume and restart the stack:

```bash
./scripts/stop-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
docker volume rm mirrornet-api-stack_haf-datadir
./scripts/start-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

If the docker-1 container fails to start with a certificate error, stop the stack, remove all the certificates and start it again  
to generate fresh ones.

```bash
./scripts/stop-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
docker volume rm mirrornet-api-stack_docker-certs-client
docker volume rm mirrornet-api-stack_docker-certs-server
docker volume rm mirrornet-api-stack_docker-certs-ca
./scripts/start-stack.sh --env-files="${SRC_DIR}/stack/mirrornet-stack.env" --project-name=mirrornet-api-stack --profiles=denser
```

## SSL on development machine

You can put your `server-key.pem` and `server-cert.pem` into `./ssl`
directory (it is gitignored). Then you can use commands like `npm run
devssl:blog` to start application on development server in SSL mode. Use
`mkcert` or any other similar tool to generate server certificates. See
also
[https://vercel.com/guides/access-nextjs-localhost-https-certificate-self-signed]
and issue #329.
