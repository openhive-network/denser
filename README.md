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

## SSL on development machine

You can put your `server-key.pem` and `server-cert.pem` into `./ssl`
directory (it is gitignored). Then you can use commands like `npm run
dev:blog` to start application on development server in SSL mode. Use
`mkcert` or any other similar tool to generate server certificates. See
also
https://vercel.com/guides/access-nextjs-localhost-https-certificate-self-signed
and issue #329.
