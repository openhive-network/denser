# Denser

**Decentralized social media app for Hive Blockchain ⛓️**
Successor to hive/condenser> aka [hive.blog](https://hive.blog/).

## Introduction

The project consists of three apps:

- auth
- blog
- wallet

## Prerequisites

- Node.js >= 18.17.0

If you have Volta installed, the 18.17.0 version of Node.js in pinned in the main [package.json](package.json) file.

## Building

The following commands install the dependencies and build the apps

```bash
npm install
npm run build
```

You can build the apps separately using commands:

```bash
npm run build:blog
npm run build:wallet
npm run build:auth
```

## Running

The following commands start the blog app on port 3000, the wallet app on port 4000 and the auth app on port 5000:

```bash
npm run start:blog
npm run start:wallet
npm run start:auth
```

## Testing

To run tests use the following commands:

```bash
npm run all:pw:test:local
```

You can run the test for only the blog or only the wallet apps using one of the following commands:

```bash
npm run blog:pw:test:local
npm run wallet:pw:test:local
```

## Dockerisation

### Build

To build Docker images use the following commands:

```bash
scripts/build_instance.sh --app-scope='@hive/auth' --app-path='/apps/auth' --app-name='auth' "$(pwd)"
scripts/build_instance.sh --app-scope='@hive/blog' --app-path='/apps/blog' --app-name='blog' "$(pwd)"
scripts/build_instance.sh --app-scope='@hive/wallet' --app-path='/apps/wallet' --app-name='wallet' "$(pwd)"
```

All the options available can be displayed by running `scripts/build_instance.sh --help`.

### Startup

To start Docker images run the following commands:

```bash
scripts/run_instance.sh \
    --image="registry.gitlab.syncad.com/hive/denser/auth:latest" \
    --app-scope="@hive/auth" \
    --app-path="/apps/auth" \
    --api-endpoint="https://api.hive.blog" \
    --images-endpoint="https://images.hive.blog/" \
    --name="denser-auth" \
    --port=5000 \
    --detach
scripts/run_instance.sh \
    --image="registry.gitlab.syncad.com/hive/denser/blog:latest" \
    --app-scope="@hive/blog" \
    --app-path="/apps/blog" \
    --api-endpoint="https://api.hive.blog" \
    --images-endpoint="https://images.hive.blog/" \
    --name="denser-blog" \
    --port=3000 \
    --detach
scripts/run_instance.sh \
    --image="registry.gitlab.syncad.com/hive/denser/wallet:latest" \
    --app-scope="@hive/wallet" \
    --app-path="/apps/wallet" \
    --api-endpoint="https://api.hive.blog" \
    --images-endpoint="https://images.hive.blog/" \
    --name="denser-wallet" \
    --port=4000 \
    --detach
```

They will start the auth app on port 5000, the blog app on port 3000 and the wallet app on port 4000.
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

The following scripts are provided for configuring and managing a local HAF API stack:

- [scripts/get-stack-logs.sh](scripts/get-stack-logs.sh)
- [scripts/setup-stack.sh](scripts/setup-stack.sh)
- [scripts/start-stack.sh](scripts/start-stack.sh)
- [scripts/stop-stack.sh](scripts/stop-stack.sh)
- [scripts/wait-for-stack.sh](scripts/wait-for-stack.sh)

The procedure of starting a local mirrornet stack with faketime for Denser tests is as follows:

Obtain the block_log and the block_log_util files.

Build local Denser docker images:

```bash
scripts/build_instance.sh --app-name="auth" --tag="local"
scripts/build_instance.sh --app-name="blog" --tag="local"
scripts/build_instance.sh --app-name="wallet" --tag="local"
```

Configure the stack using the command:

```bash
./scripts/setup-stack.sh \
  --docker-tls-port=2376 \
  --api-http-port=80 \
  --api-https-port=443 \
  --auth-port=5000 \
  --blog-port=3000 \
  --wallet-port=4000 \
  --block-log-source="/full/path/to/directory/containing/the/block_log/file" \
  --block-log-util-path="/full/path/to/block_log_util" \
  --use-faketime=true \
  --chain-id=44 \
  --dind-tag=3e8ee85c \
  --compose-tag=3e8ee85c \
  --auth-tag=local \
  --blog-tag=local \
  --wallet-tag=local \
  --haf-config-path="/full/path/to/the/denser/working/directory/stack/mirrornet_haf_config.ini" \
  --haf-arguments="--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block 5004741" \
  --use-alternate-haproxy-config=true \
  --haf-data-directory=/full/path/to/stacks/data/directory \
  --haf-registry=registry.gitlab.syncad.com/hive/haf/mirrornet-instance \
  --haf-version=87ab368c \
  --hivemind-registry=registry.gitlab.syncad.com/hive/hivemind/instance \
  --hivemind-version=9fd75477 \
  --hafah-registry=registry.gitlab.syncad.com/hive/hafah/instance \
  --hafah-version=e97307ba \
  --env-path="/full/path/to/mirronet-stack.env"
```

Please provide full, absolute paths for `--block-log-source`, `--block-log-util-path`, `--haf-config-path`, `--haf-data-directory` and `--env-path` parameters. `--env-path` is the file where the configuration
of the new stack will be saved. `--haf-data-directory` will be created if it does not exist. `--block-log-source` must point to the folder where the block_log file exists, not to the file itself.

If your computer has a proper domain name, you can pass it to the stack by adding `--public-hostname` parameter to the command above, ie. `--public-hostname=your.domain.name`.
Otherwise the stack will use *your-hostname.local* as its domain name.

`--dind-tag` and `--compose-tag` should be set to the same version. Available versions can be checked in [dind](https://gitlab.syncad.com/hive/haf_api_node/container_registry/641)
and [compose](https://gitlab.syncad.com/hive/haf_api_node/container_registry/640) registries on GitLab.

You can use any of the recent HAF, Hivemind and HAfAH versions - as long as they're compatible with each other.

This will create stack's data directory, generate block_log.artifacts file, copy the block log, the artifacts file and the HAF ini file to the data directory
and store stack's configuration in `/path/to/mirronet-stack.env`. The process will take a while. If you don't know the block log's size (for the `--stop-at-block` parameter), you can
use a placeholder value and then replace it in the `/path/to/mirronet-stack.env` with the correct value (displayed by the setup script) afterwards. **It is importatnt that the block log size is accurate**

You can change the API ports to something other than 80 and 443, but there is no guarantee that HTTP-to-HTTPS redirect will work corectly - since Denser
connects to the HTTPS port directly, this is not that important. You can freely change `--docker-tls-port`, `--auth-port`, `--blog-port` and `--wallet-port` to suit your needs.

Now start the stack using the command:

```bash
./scripts/start-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
```

and wait for HAF replay and Hivemind sync to finish:

```bash
./scripts/wait-for-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser --wait-for-sync=true
```

This will likely take a long time to complete.

Once the replay and sync are done, backup the stack's data directory to avoid having to perform replay and sync every time you restart the stack.

```bash
# Stop the stack first
./scripts/stop-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack  --profile=denser

# `sudo` is necessary due to PostgreSQL's data belonging to PostgreSQL user.
sudo cp --recursive --preserve /full/path/to/stacks/data/directory{,.bak}
```

After completing the backup, edit you dotenv file and restart the stack.

```bash
./scripts/start-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
nano /full/path/to/mirronet-stack.env # use whichever editor you want, nano is just an example
# now remove --replay-blockchain and --stop-at-block arguments, eg. replace line
# ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n --replay-blockchain --stop-at-block 5004741
# with
# ARGUMENTS=--chain-id=44 --skeleton-key=5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVapX1Kzq2n
./scripts/wait-for-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
```

You can easily restore the backup with the following steps:

```bash
./scripts/stop-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
sudo rm -rf /full/path/to/stacks/data/directory
sudo cp --recursive --preserve /full/path/to/stacks/data/directory{.bak,}
docker volume rm mirrornet-api-stack-haf-datadir
./scripts/start-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
./scripts/wait-for-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser

```

Now that the stack is running (and assuming you set `--blog-port` to `3000` as in the example above),
you can access you Denser instance on [https://your-hostname.local:3000] or [https://your.domain.name:3000] - note the HTTPS in the URL.

Since the stack runs on a fake time in the past and has self-signed certificates, you need to use a browser that also runs on a fake time and with security
disabled. Chrome works well for the purpose. On Ubuntu, you can start it with command (you may have to install faketime first: `sudo apt install faketime`):

```bash
faketime -f "@[timestamp]" /opt/google/chrome/chrome --ignore-certificate-errors
```

where [timestamp] is the timestamp of the latest block (you can check it at the end of file `/full/path/to/stacks/data/directory/docker_entrypoint.log`).
Note that HAF runs in UTC timezone and adjust the timestamp accordingly.

For example, if the latest block was created at *2016-09-16T05:27:09* and your PC is set to UTC+2 timezone, the command is as follows:

```bash
faketime -f "@2016-09-16T07:27:09" /opt/google/chrome/chrome --ignore-certificate-errors
```

You can stop the stack with command:

```bash
./scripts/stop-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
```

as mentioned above.

You can obtain the stack's logs using one of the commands:

```bash
# Get logs for all services
./scripts/get-stack-logs.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser

# Get the last 10 lines logs per service for all services
./scripts/get-stack-logs.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser --tail=10

# If you want to know the service names, the easiest way is to run
./scripts/get-stack-logs.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser --tail=1
# This will display one line of logs per service for all services. Each line will start with `service-name-1  |` 

# Get logs for specific service (in this case haf).
./scripts/get-stack-logs.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser --service=haf

# Save the logs to file
./scripts/get-stack-logs.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser --no-color 2>&1 > mirrornet-api-stack.log
```

In order to update Denser version (to include new local changes, for example) you need to:

- rebuild Denser's Docker images,
- stop the stack,
- restore the stack's backup,
- optionally edit the stack's dotenv file if you changed Denser's image tag,
- restart the stack.

This is to keep Denser and HAF containers' time in sync.

Important URLs

- [https://your-hostname.local/admin/] or [https://your.domain.name/admin/] - the stack's admin panel
- [https://your-hostname.local/admin/haproxy/] or [https://your.domain.name/admin/haproxy] - HAproxy's statistics report

Do not worry if your browser complains about SSL certificates (NET::ERR_CERT_AUTHORITY_INVALID) and wants you to confirm accessing those URLs - the stack is using self-signed certificates.

Quick cURL queries to check ifthe API is working properly:

```bash
curl -vk -X POST --data '{"jsonrpc":"2.0", "method":"condenser_api.get_block", "params":[1], "id":1}' https://your.domain.name/ # Hive
curl -vk -X POST https://your.domain.name/hafah/get_version # HAfAH
curl -vk -X POST --data '{"jsonrpc":"2.0", "method":"condenser_api.get_trending_tags", "id":1}' https://your.domain.name/ # Hivemind
```

API stack's individual containers are wrapped in the docker container, so they cannot be accessed directly, eg `docker inspect haf-world-haf-1`. If you need to access them, you need to do so from within
the dind container, eg.

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

> Error response from daemon: error while mounting volume '/var/lib/docker/volumes/mirrornet-api-stack_haf-datadir/_data': failed to mount local volume: mount /some/path:/var/lib/docker/volumes/mirrornet-api-stack_haf-datadir/_data, flags: 0x1000: no such file or directory

you need to stop the stack, remove the volume and restart the stack:

```bash
./scripts/stop-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
docker volume rm mirrornet-api-stack_haf-datadir
./scripts/start-stack.sh --env-files=/full/path/to/mirronet-stack.env --project-name=mirrornet-api-stack --profile=denser
```

## SSL on development machine

You can put your `server-key.pem` and `server-cert.pem` into `./ssl`
directory (it is gitignored). Then you can use commands like `npm run
devssl:blog` to start application on development server in SSL mode. Use
`mkcert` or any other similar tool to generate server certificates. See
also
[https://vercel.com/guides/access-nextjs-localhost-https-certificate-self-signed]
and issue #329.
